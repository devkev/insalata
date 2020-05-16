#!/usr/bin/env python3

import asyncio
import json
import random
import copy
import os
import uuid
import string
import datetime

import aiohttp.web
from motor.motor_asyncio import AsyncIOMotorClient
import pymongo
from bson import SON


HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8080))


async def createNewGameState(db, board_id):
    state = {
      "in_progress": False,
      "time_started": str(datetime.datetime.now()),
      "time_ended": None,
      "move_timeout": 30000,
      "num_events": 0,
      "cards_left": [],
      "round": 1,
      "players": [],
      "plays": []
    }

    state["board"] = await db.boards.find_one(board_id)
    if not state["board"]:
        return None

    for i in range(len(state["board"]["cells"])):
        state["board"]["cells"][i]["num"] = i

    for cell in state["board"]["cells"]:
        cell["connected_cells"] = {}

    for edge in state["board"]["edges"]:
        state["board"]["cells"][edge[0]]["connected_cells"][str(edge[1])] = True
        state["board"]["cells"][edge[1]]["connected_cells"][str(edge[0])] = True

    state["board"]["shops"] = {}
    for shopName in state["board"]["shopNames"]:
        state["board"]["shops"][shopName] = []

    state["board"]["all_shops"] = []
    for cell in state["board"]["cells"]:
        if "contents" in cell:
            for shopName in state["board"]["shopNames"]:
                if cell["contents"] == shopName:
                    state["board"]["all_shops"].append(cell["num"])
                    state["board"]["shops"][shopName].append(cell["num"])

    state["board"]["targets"] = {}
    for targetName in state["board"]["targetsPoints"].keys():
        state["board"]["targets"][targetName] = []

    state["board"]["all_targets"] = []
    for cell in state["board"]["cells"]:
        if "contents" in cell:
            for targetName in state["board"]["targetsPoints"].keys():
                if cell["contents"] == targetName:
                    state["board"]["all_targets"].append(cell["num"])
                    state["board"]["targets"][targetName].append(cell["num"])

    for color in state["board"]["cellColors"].keys():
        currColor = state["board"]["cellColors"][color]
        for x in range (0, currColor["count"]):
            state["cards_left"].append(color)
    if "wilds" in state["board"]:
        for x in range(0, state["board"]["wilds"]):
               state["cards_left"].append("wild")

    # FIXME: on DuplicateKey, generate another _id and shortcode and try again.
    state["_id"] = str(uuid.uuid4())
    state["shortcode"] = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    result = await db.games.insert_one(state)

    return state


async def addNewPlayerToGame(db, state, player_id):
    if getPlayerIndex(state["players"], player_id) is None:
        newPlayer = {
          "id": player_id,
          "name": "you",
          "score": {
              "targets_current_round": 0,
              "target_rounds": [],
              "targets_previous_rounds": [],
              "shops_joined": [],
              "bonuses": []
          },
          "moves": [],
          "cells_connected_to_shops": {},
          "targets_connected_to_shops": {},
          "connected_targets": {},
          "connected_target_types": {},
          "connected_shops": {},
          "active_cells": {}
        }
        state["players"].append(newPlayer)
        await db.games.update_one({"_id": state["_id"]}, SON([("$push", SON([("players", newPlayer)]))]))


async def startGame(db, state):
    state["in_progress"] = True
    await db.games.update_one({"_id": state["_id"]}, SON([("$set", SON([("in_progress", True)]))]))
    await generateRandomPlay(db, state)


async def getGameState(db, game_shortcode):
    return await db.games.find_one(SON([("shortcode", game_shortcode)]))

async def generateRandomPlay(db, state):
    newPlay = random.sample(state["cards_left"], 2)
    state["cards_left"].remove(newPlay[0])
    state["cards_left"].remove(newPlay[1])
    state["plays"].append(newPlay)
    await db.games.update_one({"_id": state["_id"]}, SON([("$push", SON([("plays", newPlay)])), ("$set", SON([("cards_left", state["cards_left"])]))]))



def computeConnectedToCell(cell, connected_cells, playerState):
    #print("computing connected to cell", cell)
    seen = {}
    queue = [cell]
    while len(queue) > 0:
        current = queue[0]
        queue = queue[1:]
        #print("current:", current, ", queue:", queue, ", seen: ", seen)
        if current not in seen:
            seen[current] = True
            for connected in connected_cells[current].keys():
                if connected not in seen:
                    queue.append(connected)
    del seen[cell]
    return seen

def convert_dict_keys_to_strings(d):
    result = {}
    for x in d.keys():
        result[str(x)] = d[x]
    return result

def computeConnectedsForPlayer(board, playerState):
    player_cell_connections = []
    for cell in board["cells"]:
        player_cell_connections.append({})
    for edgeIndex in playerState["moves"]:
        edge = board["edges"][edgeIndex]
        player_cell_connections[edge[0]][edge[1]] = True
        player_cell_connections[edge[1]][edge[0]] = True
        playerState["active_cells"][str(edge[0])] = True
        playerState["active_cells"][str(edge[1])] = True

    shops = board["shops"]
    for shopName in shops.keys():
        for shop in shops[shopName]:
            connected_cells = computeConnectedToCell(shop, player_cell_connections, playerState["moves"])
            playerState["cells_connected_to_shops"][shopName] = convert_dict_keys_to_strings(connected_cells)
            for connected_cell in connected_cells:
                if connected_cell in shops[shopName]:
                    playerState["connected_shops"][str(connected_cell)] = True
                for targetName in board["targets"].keys():
                    if connected_cell in board["targets"][targetName]:
                        playerState["connected_targets"][str(connected_cell)] = True
                        if shopName not in playerState["targets_connected_to_shops"]:
                            playerState["targets_connected_to_shops"][shopName] = {}
                        playerState["targets_connected_to_shops"][shopName][str(connected_cell)] = True


def updatePlayerScore(prevPlayerState, playerState, board):
    if len(playerState["connected_shops"].keys()) > len(prevPlayerState["connected_shops"].keys()):
        # newly connected shops
        playerState["score"]["shops_joined"].append(5)

    if len(playerState["connected_targets"].keys()) > len(prevPlayerState["connected_targets"].keys()):
        # newly connected targets
        new_targets = []
        for connected_target in playerState["connected_targets"].keys():
            if connected_target not in prevPlayerState["connected_targets"]:
                new_targets.append(connected_target)

        print(new_targets)

        for new_target in new_targets:
            target_type = board["cells"][int(new_target)]["contents"]
            print(target_type)
            if target_type not in playerState["connected_target_types"]:
                playerState["connected_target_types"][target_type] = 0

            num_targets = playerState["connected_target_types"][target_type]
            print(num_targets)
            score_increment = board["targetsPoints"][target_type][num_targets]
            playerState["score"]["targets_current_round"] = playerState["score"]["targets_current_round"] + score_increment
            playerState["connected_target_types"][target_type] = playerState["connected_target_types"][target_type] + 1



# maybe this isn't ever needed...?
#def computeConnecteds(state):
#    for player in state["players"]:
#        prevPlayerState = copy.deepcopy(player)
#        computeConnectedsForPlayer(state["board"], player)
#        updatePlayerScore(prevPlayerState, player, state["board"])



#async def testhandle(request):
#    return aiohttp.web.Response(text='Test handle')

async def getPlayerId(db, player_cookie, expected_player_id):
    document = await db.player_cookies.find_one(SON([("cookie", player_cookie)]))
    if not document or document["_id"] != expected_player_id:
        return None
    else:
        return document["_id"]


async def root_handler(request):
    #return aiohttp.web.HTTPFound('/index.html')
    response = aiohttp.web.FileResponse('../frontend/index.html')
    db = request.app['db']
    if "player_cookie" not in request.cookies or "player_id" not in request.cookies or await getPlayerId(db, request.cookies["player_cookie"], request.cookies["player_id"]) is None:
        now = datetime.datetime.now()
        player_cookie_doc = {
            "_id": str(uuid.uuid4()),
            "cookie": ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase + string.digits, k=42)),
            "created": now,
            "lastused": now,
        }
        result = await db.player_cookies.insert_one(player_cookie_doc)
        response.set_cookie('player_cookie', player_cookie_doc["cookie"], max_age = 10*365*24*60*60)
        response.set_cookie('player_id', player_cookie_doc["_id"], max_age = 10*365*24*60*60)
    return response


def getPlayerIndex(players, player_id):
    for playerIndex in range(len(players)):
        if players[playerIndex]["id"] == player_id:
            return playerIndex


async def sendMsgToWS(ws, msg):
    await ws.send_str(json.dumps(msg))


async def websocket_handler(request):
    ws = aiohttp.web.WebSocketResponse()
    await ws.prepare(request)
    print(request.cookies)
    if "player_cookie" not in request.cookies or "player_id" not in request.cookies:
        await ws.close()
        return ws
    player_cookie = request.cookies["player_cookie"]
    db = request.app['db']
    player_id = await getPlayerId(db, player_cookie, request.cookies["player_id"])
    if player_id is None:
        await ws.close()
        return ws

    print('new websocket connection accepted')

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            try:
                inmsg = json.loads(msg.data)
            except json.JSONDecodeError:
                await sendMsgToWS(ws, { "error": True, "reason": "Unable to parse input" })
                continue
            print(inmsg)

            if inmsg["type"] == "createGame":
                if "board_id" in inmsg:
                    board_id = inmsg["board_id"]
                else:
                    board_id = 3

                state = await createNewGameState(db, board_id)
                if not state:
                    await sendMsgToWS(ws, { "error": True, "reason": "Unknown board id", "board_id": board_id })
                    continue

                await sendMsgToWS(ws, { "error": False, "type": "createdGame", "state": state })

            elif inmsg["type"] == "joinGame":
                game_shortcode = inmsg["gameShortCode"]
                state = await getGameState(db, game_shortcode)
                if not state:
                    await sendMsgToWS(ws, { "error": True, "reason": "Unknown game shortcode", "game_shortcode": game_shortcode })
                    continue

                max_players = 8
                if len(state["players"]) >= max_players:
                    await sendMsgToWS(ws, { "error": True, "reason": "Game is full", "max_players": max_players })
                    continue

                await addNewPlayerToGame(db, state, player_id)

                await sendMsgToWS(ws, { "error": False, "type": "joinedGame", "state": state })

                #if len(state["players"]) == 2:
                if len(state["players"]) == 1 and not state["in_progress"]:
                    await startGame(db, state)

                    # FIXME: send to the websockets of all players!!!!!!
                    await sendMsgToWS(ws, { "error": False, "type": "startedGame", "state": state })

            elif inmsg["type"] == "doMove":
                game_shortcode = inmsg["gameShortCode"]
                state = await getGameState(db, game_shortcode)
                if not state:
                    await sendMsgToWS(ws, { "error": True, "reason": "Unknown game shortcode", "game_shortcode": game_shortcode })
                    continue

                # FIXME: figure out the player from the player id
                #playerIndex = 0
                playerIndex = getPlayerIndex(state["players"], player_id)

                player = state["players"][playerIndex]
                prevPlayerState = copy.deepcopy(player)
                edgeIndex = int(inmsg["move"])
                player["moves"].append(edgeIndex)
                computeConnectedsForPlayer(state["board"], player)
                updatePlayerScore(prevPlayerState, player, state["board"])

                await db.games.update_one({"_id": state["_id"]}, SON([("$set", SON([("players." + str(playerIndex), player)]))]))

                # FIXME: only after all players have played
                await generateRandomPlay(db, state)

                await sendMsgToWS(ws, { "error": False, "type": "newPlay", "state": state })

            #else:
            #    await sendMsgToWS(ws, { "error": True, "reason": "Unknown type", "type": inmsg["type"] })

    print('Websocket connection closed')
    return ws


DB_NAME = 'insalata'

async def setup_db():
    db = AsyncIOMotorClient()[DB_NAME]

    print("Connecting to db...")
    num_boards = await db.boards.count_documents({})
    num_games = await db.games.count_documents({})
    num_completed_games = await db.completed_games.count_documents({})
    num_player_cookies = await db.player_cookies.count_documents({})
    print(f"Database contains: {num_boards} boards, {num_games} in-progress games, {num_completed_games} completed games, {num_player_cookies} player auth cookies")

    # ensure correct indexes:
    await db.games.create_index([("shortcode", pymongo.ASCENDING)], unique=True)

    return db

async def app():
    loop = asyncio.get_event_loop()
    db = await setup_db()
    app = aiohttp.web.Application(loop=loop)
    app['db'] = db
    app.router.add_static('/assets', path="../assets", name='assets')
    app.router.add_route('GET', '/ws', websocket_handler)
    app.router.add_route('GET', "/", root_handler)
    app.router.add_route('GET', "/g/{shortcode}", root_handler)
    app.router.add_static('/', path="../frontend", name='frontend')
    return app


if __name__ == '__main__':
    aiohttp.web.run_app(app(), host=HOST, port=PORT)

# vim: et:ts=4:sw=4:si:ai:

#!/usr/bin/env python3

import asyncio
import json
import random
import copy
import os
import uuid
import string

import aiohttp.web
from motor.motor_asyncio import AsyncIOMotorClient
import pymongo
from bson import SON


HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8080))


initial_state_json = '''{
  "shortcode": "",
  "in_progress": true,
  "time_started": "2020-05-15T05:43:17.171Z",
  "time_ended": null,
  "move_timeout": 30000,
  "num_events": 0,
  "num_players": 1,
  "players": [
    {
      "name": "you",
      "score": {
          "targets_current_round": 0,
          "targets_previous_rounds": [],
          "shops_joined": [],
          "bonuses": []
      },
      "auth_cookie_id": 0,
      "moves": [],
      "cells_connected_to_shops": {},
      "targets_connected_to_shops": {},
      "connected_targets": {},
      "connected_shops": {},
      "active_cells": {}
    }
  ],
  "plays": []
}'''


async def createNewGameState(db, board_id):
    state = json.loads(initial_state_json)
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

    # FIXME: on DuplicateKey, generate another _id and shortcode and try again.
    state["_id"] = str(uuid.uuid4())
    state["shortcode"] = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    result = await db.games.insert_one(state)

    # FIXME: this should move to startGame
    await generateRandomPlay(db, state)

    return state

async def getGameState(db, game_shortcode):
    return await db.games.find_one(SON([("shortcode", game_shortcode)]))


def randomColorOrWild(board):
    colorsOrWild = list(board["cellColors"].keys()).copy()
    colorsOrWild.append("wild");
    return random.choice(colorsOrWild)

async def generateRandomPlay(db, state):
    newPlay = [ randomColorOrWild(state["board"]), randomColorOrWild(state["board"]) ]
    await db.games.update_one({"_id": state["_id"]}, SON([("$push", SON([("plays", newPlay)]))]))
    state["plays"].append(newPlay)



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



def updatePlayerScore(prevPlayerState, playerState):
    if len(playerState["connected_shops"].keys()) > len(prevPlayerState["connected_shops"].keys()):
        # newly connected shops
        playerState["score"]["shops_joined"].append(5)

    if len(playerState["connected_targets"].keys()) > len(prevPlayerState["connected_targets"].keys()):
        # newly connected targets
        playerState["score"]["targets_current_round"] = playerState["score"]["targets_current_round"] + 1



# maybe this isn't ever needed...?
#def computeConnecteds(state):
#    for player in state["players"]:
#        prevPlayerState = copy.deepcopy(player)
#        computeConnectedsForPlayer(state["board"], player)
#        updatePlayerScore(prevPlayerState, player)



#async def testhandle(request):
#    return aiohttp.web.Response(text='Test handle')

async def root_handler(request):
    #return aiohttp.web.HTTPFound('/index.html')
    return aiohttp.web.FileResponse('../frontend/index.html')


async def websocket_handler(request):
    ws = aiohttp.web.WebSocketResponse()
    await ws.prepare(request)
    print('new websocket connection accepted')

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            response = {}
            try:
                inmsg = json.loads(msg.data)
                print(inmsg)

                db = request.app['db']

                #response = { "error": False, "input": inmsg }

                if inmsg["type"] == "createGame":
                    if "board_id" in inmsg:
                        board_id = inmsg["board_id"]
                    else:
                        board_id = 2
                    state = await createNewGameState(db, board_id)
                    if state:
                        response = { "error": False, "type": "createdGame", "state": state }
                    else:
                        response = { "error": True, "reason": "Unknown board id", "board_id": board_id }

                elif inmsg["type"] == "joinGame":
                    # FIXME: figure out the player from the auth token

                    game_shortcode = inmsg["gameShortCode"]
                    state = await getGameState(db, game_shortcode)
                    if state:
                        response = { "error": False, "type": "joinedGame", "state": state }
                    else:
                        response = { "error": True, "reason": "Unknown game shortcode", "game_shortcode": game_shortcode }

                elif inmsg["type"] == "doMove":
                    # FIXME: figure out the player from the auth token
                    playerIndex = 0

                    game_shortcode = inmsg["gameShortCode"]
                    state = await getGameState(db, game_shortcode)

                    player = state["players"][playerIndex]
                    prevPlayerState = copy.deepcopy(player)
                    edgeIndex = int(inmsg["move"])
                    player["moves"].append(edgeIndex)
                    computeConnectedsForPlayer(state["board"], player)
                    updatePlayerScore(prevPlayerState, player)

                    await db.games.update_one({"_id": state["_id"]}, SON([("$set", SON([("players." + str(playerIndex), player)]))]))

                    await generateRandomPlay(db, state)

                    response = { "error": False, "type": "newPlay", "state": state }

                else:
                    response = { "error": True, "reason": "Unknown type", "type": inmsg["type"] }

            except json.JSONDecodeError:
                response = { "error": True, "reason": "Unable to parse input" }
            await ws.send_str(json.dumps(response))

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

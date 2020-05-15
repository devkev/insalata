#!/usr/bin/env python3

import asyncio
import json
import random
import copy
import os

import aiohttp.web

HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8080))


board_json = '''{
  "_id": 1,
  "name": "test",
  "numRounds": 2,
  "cellColors": {
    "red": { "normal": "#f004", "highlight": "#f00a" },
    "green": { "normal": "#0f04", "highlight": "#0f0a" },
    "blue": { "normal": "#00f4", "highlight": "#00fa" }
  },
  "shopNames": [ "shopA", "shopB", "shopC", "shopD", "shopE" ],
  "targetsPoints": {
    "bowl": [ 1, 2 ],
    "lettuce": [ 2, 2 ],
    "tomato": [ 2, 3 ],
    "cucumber": [ 3, 4 ],
    "dressing": [ 4, 5 ]
  },
  "cells": [
    {
      "x": 25,
      "y": 25,
      "color": "red",
      "contents": "shopA"
    },
    {
      "x": 68.30127018922192,
      "y": 25,
      "color": "blue"
    },
    {
      "x": 111.60254037844386,
      "y": 25,
      "color": "red"
    },
    {
      "x": 154.9038105676658,
      "y": 25,
      "color": "blue"
    },
    {
      "x": 198.20508075688772,
      "y": 25,
      "color": "red",
      "contents": "shopE"
    },
    {
      "x": 241.50635094610965,
      "y": 25,
      "color": "red"
    },
    {
      "x": 284.8076211353316,
      "y": 25,
      "color": "red"
    },
    {
      "x": 328.1088913245535,
      "y": 25,
      "color": "green"
    },
    {
      "x": 371.41016151377545,
      "y": 25,
      "color": "blue"
    },
    {
      "x": 414.7114317029974,
      "y": 25,
      "color": "red"
    },
    {
      "x": 46.65063509461096,
      "y": 62.5,
      "color": "blue",
      "contents": "lettuce"
    },
    {
      "x": 89.95190528383289,
      "y": 62.5,
      "color": "blue"
    },
    {
      "x": 133.25317547305482,
      "y": 62.5,
      "color": "blue",
      "contents": "cucumber"
    },
    {
      "x": 176.55444566227678,
      "y": 62.5,
      "color": "green"
    },
    {
      "x": 219.8557158514987,
      "y": 62.5,
      "color": "blue"
    },
    {
      "x": 263.1569860407206,
      "y": 62.5,
      "color": "red"
    },
    {
      "x": 306.45825622994255,
      "y": 62.5,
      "color": "red"
    },
    {
      "x": 349.75952641916444,
      "y": 62.5,
      "color": "red",
      "contents": "shopB"
    },
    {
      "x": 393.0607966083864,
      "y": 62.5,
      "color": "green"
    },
    {
      "x": 436.36206679760835,
      "y": 62.5,
      "color": "blue"
    },
    {
      "x": 25,
      "y": 100,
      "color": "red"
    },
    {
      "x": 68.30127018922192,
      "y": 100,
      "color": "green"
    },
    {
      "x": 111.60254037844386,
      "y": 100,
      "color": "green"
    },
    {
      "x": 154.9038105676658,
      "y": 100,
      "color": "green"
    },
    {
      "x": 198.20508075688772,
      "y": 100,
      "color": "red"
    },
    {
      "x": 241.50635094610965,
      "y": 100,
      "color": "blue",
      "contents": "shopD"
    },
    {
      "x": 284.8076211353316,
      "y": 100,
      "color": "blue"
    },
    {
      "x": 328.1088913245535,
      "y": 100,
      "color": "red",
      "contents": "dressing"
    },
    {
      "x": 371.41016151377545,
      "y": 100,
      "color": "red"
    },
    {
      "x": 414.7114317029974,
      "y": 100,
      "color": "red",
      "contents": "shopC"
    },
    {
      "x": 46.65063509461096,
      "y": 137.5,
      "color": "green"
    },
    {
      "x": 89.95190528383289,
      "y": 137.5,
      "color": "green"
    },
    {
      "x": 133.25317547305482,
      "y": 137.5,
      "color": "blue",
      "contents": "shopD"
    },
    {
      "x": 176.55444566227678,
      "y": 137.5,
      "color": "green",
      "contents": "bowl"
    },
    {
      "x": 219.8557158514987,
      "y": 137.5,
      "color": "green"
    },
    {
      "x": 263.1569860407206,
      "y": 137.5,
      "color": "red"
    },
    {
      "x": 306.45825622994255,
      "y": 137.5,
      "color": "green"
    },
    {
      "x": 349.75952641916444,
      "y": 137.5,
      "color": "blue"
    },
    {
      "x": 393.0607966083864,
      "y": 137.5,
      "color": "red"
    },
    {
      "x": 436.36206679760835,
      "y": 137.5,
      "color": "blue"
    },
    {
      "x": 25,
      "y": 175,
      "color": "green"
    },
    {
      "x": 68.30127018922192,
      "y": 175,
      "color": "green"
    },
    {
      "x": 111.60254037844386,
      "y": 175,
      "color": "green"
    },
    {
      "x": 154.9038105676658,
      "y": 175,
      "color": "red"
    },
    {
      "x": 198.20508075688772,
      "y": 175,
      "color": "red"
    },
    {
      "x": 241.50635094610965,
      "y": 175,
      "color": "green"
    },
    {
      "x": 284.8076211353316,
      "y": 175,
      "color": "blue"
    },
    {
      "x": 328.1088913245535,
      "y": 175,
      "color": "blue"
    },
    {
      "x": 371.41016151377545,
      "y": 175,
      "color": "red",
      "contents": "shopE"
    },
    {
      "x": 414.7114317029974,
      "y": 175,
      "color": "red"
    },
    {
      "x": 46.65063509461096,
      "y": 212.5,
      "color": "blue",
      "contents": "tomato"
    },
    {
      "x": 89.95190528383289,
      "y": 212.5,
      "color": "red"
    },
    {
      "x": 133.25317547305482,
      "y": 212.5,
      "color": "green"
    },
    {
      "x": 176.55444566227678,
      "y": 212.5,
      "color": "red"
    },
    {
      "x": 219.8557158514987,
      "y": 212.5,
      "color": "green"
    },
    {
      "x": 263.1569860407206,
      "y": 212.5,
      "color": "red"
    },
    {
      "x": 306.45825622994255,
      "y": 212.5,
      "color": "blue"
    },
    {
      "x": 349.75952641916444,
      "y": 212.5,
      "color": "red"
    },
    {
      "x": 393.0607966083864,
      "y": 212.5,
      "color": "blue"
    },
    {
      "x": 436.36206679760835,
      "y": 212.5,
      "color": "red"
    },
    {
      "x": 25,
      "y": 250,
      "color": "green"
    },
    {
      "x": 68.30127018922192,
      "y": 250,
      "color": "red"
    },
    {
      "x": 111.60254037844386,
      "y": 250,
      "color": "red"
    },
    {
      "x": 154.9038105676658,
      "y": 250,
      "color": "red"
    },
    {
      "x": 198.20508075688772,
      "y": 250,
      "color": "blue"
    },
    {
      "x": 241.50635094610965,
      "y": 250,
      "color": "green",
      "contents": "shopA"
    },
    {
      "x": 284.8076211353316,
      "y": 250,
      "color": "blue"
    },
    {
      "x": 328.1088913245535,
      "y": 250,
      "color": "blue"
    },
    {
      "x": 371.41016151377545,
      "y": 250,
      "color": "red"
    },
    {
      "x": 414.7114317029974,
      "y": 250,
      "color": "green"
    },
    {
      "x": 46.65063509461096,
      "y": 287.5,
      "color": "green"
    },
    {
      "x": 89.95190528383289,
      "y": 287.5,
      "color": "red"
    },
    {
      "x": 133.25317547305482,
      "y": 287.5,
      "color": "green",
      "contents": "shopB"
    },
    {
      "x": 176.55444566227678,
      "y": 287.5,
      "color": "red"
    },
    {
      "x": 219.8557158514987,
      "y": 287.5,
      "color": "green"
    },
    {
      "x": 263.1569860407206,
      "y": 287.5,
      "color": "blue"
    },
    {
      "x": 306.45825622994255,
      "y": 287.5,
      "color": "red"
    },
    {
      "x": 349.75952641916444,
      "y": 287.5,
      "color": "red"
    },
    {
      "x": 393.0607966083864,
      "y": 287.5,
      "color": "red"
    },
    {
      "x": 436.36206679760835,
      "y": 287.5,
      "color": "red"
    },
    {
      "x": 25,
      "y": 325,
      "color": "blue"
    },
    {
      "x": 68.30127018922192,
      "y": 325,
      "color": "blue"
    },
    {
      "x": 111.60254037844386,
      "y": 325,
      "color": "red"
    },
    {
      "x": 154.9038105676658,
      "y": 325,
      "color": "blue"
    },
    {
      "x": 198.20508075688772,
      "y": 325,
      "color": "blue"
    },
    {
      "x": 241.50635094610965,
      "y": 325,
      "color": "red"
    },
    {
      "x": 284.8076211353316,
      "y": 325,
      "color": "red",
      "contents": "shopC"
    },
    {
      "x": 328.1088913245535,
      "y": 325,
      "color": "green"
    },
    {
      "x": 371.41016151377545,
      "y": 325,
      "color": "red"
    },
    {
      "x": 414.7114317029974,
      "y": 325,
      "color": "red"
    },
    {
      "x": 46.65063509461096,
      "y": 362.5,
      "color": "red"
    },
    {
      "x": 89.95190528383289,
      "y": 362.5,
      "color": "red"
    },
    {
      "x": 133.25317547305482,
      "y": 362.5,
      "color": "blue"
    },
    {
      "x": 176.55444566227678,
      "y": 362.5,
      "color": "green"
    },
    {
      "x": 219.8557158514987,
      "y": 362.5,
      "color": "red"
    },
    {
      "x": 263.1569860407206,
      "y": 362.5,
      "color": "green"
    },
    {
      "x": 306.45825622994255,
      "y": 362.5,
      "color": "blue"
    },
    {
      "x": 349.75952641916444,
      "y": 362.5,
      "color": "green"
    },
    {
      "x": 393.0607966083864,
      "y": 362.5,
      "color": "blue"
    },
    {
      "x": 436.36206679760835,
      "y": 362.5,
      "color": "green"
    }
  ],
  "edges": [
    [
      1,
      0
    ],
    [
      2,
      1
    ],
    [
      3,
      2
    ],
    [
      4,
      3
    ],
    [
      5,
      4
    ],
    [
      6,
      5
    ],
    [
      7,
      6
    ],
    [
      8,
      7
    ],
    [
      9,
      8
    ],
    [
      10,
      0
    ],
    [
      10,
      1
    ],
    [
      11,
      10
    ],
    [
      11,
      1
    ],
    [
      11,
      2
    ],
    [
      12,
      11
    ],
    [
      12,
      2
    ],
    [
      12,
      3
    ],
    [
      13,
      12
    ],
    [
      13,
      3
    ],
    [
      13,
      4
    ],
    [
      14,
      13
    ],
    [
      14,
      4
    ],
    [
      14,
      5
    ],
    [
      15,
      14
    ],
    [
      15,
      5
    ],
    [
      15,
      6
    ],
    [
      16,
      15
    ],
    [
      16,
      6
    ],
    [
      16,
      7
    ],
    [
      17,
      16
    ],
    [
      17,
      7
    ],
    [
      17,
      8
    ],
    [
      18,
      17
    ],
    [
      18,
      8
    ],
    [
      18,
      9
    ],
    [
      19,
      18
    ],
    [
      19,
      9
    ],
    [
      20,
      10
    ],
    [
      21,
      20
    ],
    [
      21,
      11
    ],
    [
      21,
      10
    ],
    [
      22,
      21
    ],
    [
      22,
      12
    ],
    [
      22,
      11
    ],
    [
      23,
      22
    ],
    [
      23,
      13
    ],
    [
      23,
      12
    ],
    [
      24,
      23
    ],
    [
      24,
      14
    ],
    [
      24,
      13
    ],
    [
      25,
      24
    ],
    [
      25,
      15
    ],
    [
      25,
      14
    ],
    [
      26,
      25
    ],
    [
      26,
      16
    ],
    [
      26,
      15
    ],
    [
      27,
      26
    ],
    [
      27,
      17
    ],
    [
      27,
      16
    ],
    [
      28,
      27
    ],
    [
      28,
      18
    ],
    [
      28,
      17
    ],
    [
      29,
      28
    ],
    [
      29,
      19
    ],
    [
      29,
      18
    ],
    [
      30,
      20
    ],
    [
      30,
      21
    ],
    [
      31,
      30
    ],
    [
      31,
      21
    ],
    [
      31,
      22
    ],
    [
      32,
      31
    ],
    [
      32,
      22
    ],
    [
      32,
      23
    ],
    [
      33,
      32
    ],
    [
      33,
      23
    ],
    [
      33,
      24
    ],
    [
      34,
      33
    ],
    [
      34,
      24
    ],
    [
      34,
      25
    ],
    [
      35,
      34
    ],
    [
      35,
      25
    ],
    [
      35,
      26
    ],
    [
      36,
      35
    ],
    [
      36,
      26
    ],
    [
      36,
      27
    ],
    [
      37,
      36
    ],
    [
      37,
      27
    ],
    [
      37,
      28
    ],
    [
      38,
      37
    ],
    [
      38,
      28
    ],
    [
      38,
      29
    ],
    [
      39,
      38
    ],
    [
      39,
      29
    ],
    [
      40,
      30
    ],
    [
      41,
      40
    ],
    [
      41,
      31
    ],
    [
      41,
      30
    ],
    [
      42,
      41
    ],
    [
      42,
      32
    ],
    [
      42,
      31
    ],
    [
      43,
      42
    ],
    [
      43,
      33
    ],
    [
      43,
      32
    ],
    [
      44,
      43
    ],
    [
      44,
      34
    ],
    [
      44,
      33
    ],
    [
      45,
      44
    ],
    [
      45,
      35
    ],
    [
      45,
      34
    ],
    [
      46,
      45
    ],
    [
      46,
      36
    ],
    [
      46,
      35
    ],
    [
      47,
      46
    ],
    [
      47,
      37
    ],
    [
      47,
      36
    ],
    [
      48,
      47
    ],
    [
      48,
      38
    ],
    [
      48,
      37
    ],
    [
      49,
      48
    ],
    [
      49,
      39
    ],
    [
      49,
      38
    ],
    [
      50,
      40
    ],
    [
      50,
      41
    ],
    [
      51,
      50
    ],
    [
      51,
      41
    ],
    [
      51,
      42
    ],
    [
      52,
      51
    ],
    [
      52,
      42
    ],
    [
      52,
      43
    ],
    [
      53,
      52
    ],
    [
      53,
      43
    ],
    [
      53,
      44
    ],
    [
      54,
      53
    ],
    [
      54,
      44
    ],
    [
      54,
      45
    ],
    [
      55,
      54
    ],
    [
      55,
      45
    ],
    [
      55,
      46
    ],
    [
      56,
      55
    ],
    [
      56,
      46
    ],
    [
      56,
      47
    ],
    [
      57,
      56
    ],
    [
      57,
      47
    ],
    [
      57,
      48
    ],
    [
      58,
      57
    ],
    [
      58,
      48
    ],
    [
      58,
      49
    ],
    [
      59,
      58
    ],
    [
      59,
      49
    ],
    [
      60,
      50
    ],
    [
      61,
      60
    ],
    [
      61,
      51
    ],
    [
      61,
      50
    ],
    [
      62,
      61
    ],
    [
      62,
      52
    ],
    [
      62,
      51
    ],
    [
      63,
      62
    ],
    [
      63,
      53
    ],
    [
      63,
      52
    ],
    [
      64,
      63
    ],
    [
      64,
      54
    ],
    [
      64,
      53
    ],
    [
      65,
      64
    ],
    [
      65,
      55
    ],
    [
      65,
      54
    ],
    [
      66,
      65
    ],
    [
      66,
      56
    ],
    [
      66,
      55
    ],
    [
      67,
      66
    ],
    [
      67,
      57
    ],
    [
      67,
      56
    ],
    [
      68,
      67
    ],
    [
      68,
      58
    ],
    [
      68,
      57
    ],
    [
      69,
      68
    ],
    [
      69,
      59
    ],
    [
      69,
      58
    ],
    [
      70,
      60
    ],
    [
      70,
      61
    ],
    [
      71,
      70
    ],
    [
      71,
      61
    ],
    [
      71,
      62
    ],
    [
      72,
      71
    ],
    [
      72,
      62
    ],
    [
      72,
      63
    ],
    [
      73,
      72
    ],
    [
      73,
      63
    ],
    [
      73,
      64
    ],
    [
      74,
      73
    ],
    [
      74,
      64
    ],
    [
      74,
      65
    ],
    [
      75,
      74
    ],
    [
      75,
      65
    ],
    [
      75,
      66
    ],
    [
      76,
      75
    ],
    [
      76,
      66
    ],
    [
      76,
      67
    ],
    [
      77,
      76
    ],
    [
      77,
      67
    ],
    [
      77,
      68
    ],
    [
      78,
      77
    ],
    [
      78,
      68
    ],
    [
      78,
      69
    ],
    [
      79,
      78
    ],
    [
      79,
      69
    ],
    [
      80,
      70
    ],
    [
      81,
      80
    ],
    [
      81,
      71
    ],
    [
      81,
      70
    ],
    [
      82,
      81
    ],
    [
      82,
      72
    ],
    [
      82,
      71
    ],
    [
      83,
      82
    ],
    [
      83,
      73
    ],
    [
      83,
      72
    ],
    [
      84,
      83
    ],
    [
      84,
      74
    ],
    [
      84,
      73
    ],
    [
      85,
      84
    ],
    [
      85,
      75
    ],
    [
      85,
      74
    ],
    [
      86,
      85
    ],
    [
      86,
      76
    ],
    [
      86,
      75
    ],
    [
      87,
      86
    ],
    [
      87,
      77
    ],
    [
      87,
      76
    ],
    [
      88,
      87
    ],
    [
      88,
      78
    ],
    [
      88,
      77
    ],
    [
      89,
      88
    ],
    [
      89,
      79
    ],
    [
      89,
      78
    ],
    [
      90,
      80
    ],
    [
      90,
      81
    ],
    [
      91,
      90
    ],
    [
      91,
      81
    ],
    [
      91,
      82
    ],
    [
      92,
      91
    ],
    [
      92,
      82
    ],
    [
      92,
      83
    ],
    [
      93,
      92
    ],
    [
      93,
      83
    ],
    [
      93,
      84
    ],
    [
      94,
      93
    ],
    [
      94,
      84
    ],
    [
      94,
      85
    ],
    [
      95,
      94
    ],
    [
      95,
      85
    ],
    [
      95,
      86
    ],
    [
      96,
      95
    ],
    [
      96,
      86
    ],
    [
      96,
      87
    ],
    [
      97,
      96
    ],
    [
      97,
      87
    ],
    [
      97,
      88
    ],
    [
      98,
      97
    ],
    [
      98,
      88
    ],
    [
      98,
      89
    ],
    [
      99,
      98
    ],
    [
      99,
      89
    ]
  ]
}'''
board = json.loads(board_json)

initial_state_json = '''{
  "_id": 1,
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
      "connected_shops": {}
    }
  ],
  "plays": []
}'''

state = json.loads(initial_state_json)
state["board"] = board

for i in range(len(state["board"]["cells"])):
    state["board"]["cells"][i]["num"] = i

for cell in state["board"]["cells"]:
    cell["connected_cells"] = {}

for edge in state["board"]["edges"]:
    state["board"]["cells"][edge[0]]["connected_cells"][edge[1]] = True
    state["board"]["cells"][edge[1]]["connected_cells"][edge[0]] = True

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



def randomColorOrWild(board):
    colorsOrWild = list(board["cellColors"].keys()).copy()
    colorsOrWild.append("wild");
    return random.choice(colorsOrWild)

def generateRandomPlay(state):
    state["plays"].append( [ randomColorOrWild(state["board"]), randomColorOrWild(state["board"]) ] )

generateRandomPlay(state)


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



def computeConnectedsForPlayer(board, playerState):
    player_cell_connections = []
    for cell in board["cells"]:
        player_cell_connections.append({})
    for edgeIndex in playerState["moves"]:
        edge = board["edges"][edgeIndex]
        player_cell_connections[edge[0]][edge[1]] = True
        player_cell_connections[edge[1]][edge[0]] = True

    shops = board["shops"]
    for shopName in shops.keys():
        for shop in shops[shopName]:
            playerState["cells_connected_to_shops"][shopName] = computeConnectedToCell(shop, player_cell_connections, playerState["moves"])
            for connected_cell in playerState["cells_connected_to_shops"][shopName]:
                if connected_cell in shops[shopName]:
                    playerState["connected_shops"][connected_cell] = True
                for targetName in board["targets"].keys():
                    if connected_cell in board["targets"][targetName]:
                        playerState["connected_targets"][connected_cell] = True
                        if shopName not in playerState["targets_connected_to_shops"]:
                            playerState["targets_connected_to_shops"][shopName] = {}
                        playerState["targets_connected_to_shops"][shopName][connected_cell] = True

def updatePlayerScore(prevPlayerState, playerState):
    if len(playerState["connected_shops"].keys()) > len(prevPlayerState["connected_shops"].keys()):
        # newly connected shops
        playerState["score"]["shops_joined"].append(5)

    if len(playerState["connected_targets"].keys()) > len(prevPlayerState["connected_targets"].keys()):
        # newly connected targets
        playerState["score"]["targets_current_round"] = state["players"][0]["score"]["targets_current_round"] + 1



# maybe this isn't ever needed...?
def computeConnecteds(state):
    for player in state["players"]:
        prevPlayerState = copy.deepcopy(player)
        computeConnectedsForPlayer(state["board"], player)
        updatePlayerScore(prevPlayerState, player)



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

                #response = { "error": False, "input": inmsg }

                if inmsg["type"] == "joinGame":
                    response = { "error": False, "type": "joinedGame", "state": state }

                elif inmsg["type"] == "doMove":
                    # FIXME: figure out the player from the auth token
                    player = state["players"][0]

                    prevPlayerState = copy.deepcopy(player)
                    edgeIndex = int(inmsg["move"])
                    player["moves"].append(edgeIndex)
                    computeConnectedsForPlayer(state["board"], player)
                    updatePlayerScore(prevPlayerState, player)

                    generateRandomPlay(state)

                    response = { "error": False, "type": "newPlay", "state": state }

                else:
                    response = { "error": True, "reason": "Unknown type", "type": inmsg["type"] }

            except json.JSONDecodeError:
                response = { "error": True, "reason": "Unable to parse input" }
            await ws.send_str(json.dumps(response))

    print('Websocket connection closed')
    return ws


def app():
    loop = asyncio.get_event_loop()
    app = aiohttp.web.Application(loop=loop)
    app.router.add_static('/assets', path="../assets", name='assets')
    app.router.add_route('GET', '/ws', websocket_handler)
    app.router.add_route('*', "/", root_handler)
    app.router.add_static('/', path="../frontend", name='frontend')
    return app


if __name__ == '__main__':
    aiohttp.web.run_app(app(), host=HOST, port=PORT)

# vim: et ts=4 si ai:

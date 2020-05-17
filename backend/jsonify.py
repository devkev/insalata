#!/usr/bin/python

import sys
import json

def split(word): 
    return [char for char in word]

f = open(sys.argv[1], "r")
counter = 0
for perm in f:
  formatted_perm = split(perm)
  formatted_perm = formatted_perm[:10]
  x = "{\"_id\": " + str(counter) + ", \"perm\": " + json.dumps(formatted_perm) + "}"
  print(x)
  counter = counter + 1

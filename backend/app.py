#!/usr/bin/env python3

import asyncio
import os

import aiohttp.web

HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8080))


#async def testhandle(request):
#    return aiohttp.web.Response(text='Test handle')

async def root_handler(request):
    #return aiohttp.web.HTTPFound('/index.html')
    return aiohttp.web.FileResponse('../frontend/index.html')


async def websocket_handler(request):
    print('Websocket connection starting')
    ws = aiohttp.web.WebSocketResponse()
    await ws.prepare(request)
    print('Websocket connection ready')

    async for msg in ws:
        print(msg)
        if msg.type == aiohttp.WSMsgType.TEXT:
            print(msg.data)
            if msg.data == 'close':
                await ws.close()
            else:
                await ws.send_str(msg.data + '/answer')

    print('Websocket connection closed')
    return ws


def app():
    loop = asyncio.get_event_loop()
    app = aiohttp.web.Application(loop=loop)
    app.router.add_static('/assets', path="../assets", name='assets')
    app.router.add_route('*', "/", root_handler)
    app.router.add_static('/', path="../frontend", name='frontend')
    app.router.add_route('GET', '/ws', websocket_handler)
    return app


if __name__ == '__main__':
    aiohttp.web.run_app(app(), host=HOST, port=PORT)

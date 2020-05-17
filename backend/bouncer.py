#!/usr/bin/env python3

import asyncio
import os

import aiohttp.web

HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8080))

async def handler(request):
    return aiohttp.web.HTTPFound('https://insalata.net/')

async def app():
    loop = asyncio.get_event_loop()
    app = aiohttp.web.Application(loop=loop)
    app.router.add_route('GET', "/{tail:.*}", handler)
    return app

if __name__ == '__main__':
    aiohttp.web.run_app(app(), host=HOST, port=PORT)

# vim: et:ts=4:sw=4:si:ai:

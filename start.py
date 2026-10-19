#!/usr/bin/env python3
"""Serve Resonance locally with Python's standard library; no network dependencies."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--host', default='127.0.0.1', help='Default: local computer only')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('port must be between 1 and 65535')
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
    try:
        with ThreadingHTTPServer((args.host, args.port), handler) as server:
            print(f'Resonance: http://{args.host}:{args.port} — Ctrl+C to stop', flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
    except OSError as exc:
        parser.exit(1, f'Could not start server: {exc}\n')


if __name__ == '__main__':
    main()

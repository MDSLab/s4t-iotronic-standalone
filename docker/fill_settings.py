#!/usr/bin/env python

"""

This script replaces values in settings.json according to ones
contained in the environment variables.

For example, if S4T_IOTRONIC_SETTINGS_CONFIG__SERVER__DB__HOST is set, then its value will be saved as

{
    "config": {
        "server": {
            "db": {
                "host": "VALUE"
            }
        }
    }
}

"""

"""

Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/
Copyright (c) 2016 Kostya Esmukov <kostya@esmukov.ru>

"""


import os
import sys
import json

_ENV_PREFIX = "S4T_IOTRONIC_SETTINGS_"
_ENV_SEPARATOR = "__"


def replace_json_value(j, keypath, value):
    o = j

    last = keypath[-1]
    keypath = keypath[:-1]

    while keypath:
        try:
            o = o[keypath[0]]
        except KeyError:
            o[keypath[0]] = {}
            o = o[keypath[0]]

        keypath = keypath[1:]

    o[last] = value


def main():
    settings_filename = sys.argv[1]

    with open(settings_filename, "r") as f:
        file_contents = f.read()

    j = json.loads(file_contents)

    for k, v in os.environ.items():
        if not k.startswith(_ENV_PREFIX):
            continue

        keypath = [s.lower() for s in k[len(_ENV_PREFIX):].split(_ENV_SEPARATOR)]

        replace_json_value(j, keypath, v)

    with open(settings_filename, "w") as f:
        f.write(json.dumps(j, indent=8, sort_keys=True))


if __name__ == "__main__":
    main()

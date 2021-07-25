#!/bin/bash
if [[ ! -f ./node_modules/eosjs-ecc/lib/index.d.ts && -f ./projects/vapaee/idp-local/@types/eosjs-ecc/index.d.ts ]]; then
    cp ./projects/vapaee/idp-local/@types/eosjs-ecc/index.d.ts ./node_modules/eosjs-ecc/lib/index.d.ts
fi
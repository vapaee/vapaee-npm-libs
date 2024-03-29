#!/bin/bash

if [[ ! -f ./node_modules/eosjs-ecc/lib/index.d.ts                                                            ||
        ./projects/vapaee/idp-local/_types/eosjs-ecc/index-d-ts.txt -nt ./node_modules/eosjs-ecc/lib/index.d.ts   ]];
then
    cp ./projects/vapaee/idp-local/_types/eosjs-ecc/index-d-ts.txt ./node_modules/eosjs-ecc/lib/index.d.ts
    echo "@types for: eosjs-ecc - fixed OK!"
fi


if [[ ! -f ./node_modules/@scatterjs/core/dist/index.d.ts                                                            ||
        ./projects/vapaee/idp-scatter/_types/scatterjs__core/index-d-ts.txt -nt ./node_modules/@scatterjs/core/dist/index.d.ts   ]];
then
    cp ./projects/vapaee/idp-scatter/_types/scatterjs__core/index-d-ts.txt ./node_modules/@scatterjs/core/dist/index.d.ts
    echo "@types for: @scatterjs/core - fixed OK!"
fi


if [[ ! -f ./node_modules/@scatterjs/eosjs2/dist/index.d.ts                                                            ||
        ./projects/vapaee/idp-scatter/_types/scatterjs__eosjs2/index-d-ts.txt -nt ./node_modules/@scatterjs/eosjs2/dist/index.d.ts   ]];
then
    cp ./projects/vapaee/idp-scatter/_types/scatterjs__eosjs2/index-d-ts.txt ./node_modules/@scatterjs/eosjs2/dist/index.d.ts
    echo "@types for: @scatterjs/eosjs2 - fixed OK!"
fi


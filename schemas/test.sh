#!/usr/bin/env bash

cd "${BASH_SOURCE%/*}/" || exit
schema_files=$(find -name '*.json')

ajv_args=""
for schema in $schema_files; do
    ajv_args="$ajv_args -r $schema"
done

RED='\033[0;31m'
GREEN='\033[0;32m'

for schema in $schema_files; do
    # set output color to red to display error info
    echo -n -e $RED
    # discarding stdout, will indicate success myself
    ajv_command="compile -s $schema $ajv_args"
    ajv $ajv_command > /dev/null
    if [ $? == 0 ]; then
        # schema passed compilation test, set output color to green
        echo -n -e $GREEN
        echo '[*]' $schema passed
    else 
        echo
        echo '[X]' $schema failed
    fi
    echo -------------------------------------
done

V=$(node -v); 
if [ \"$V\" != \"v10.23.0\" ]; then 
    echo "-- ERROR: NODE VERSION MISSMATCH --"
    echo "You are using node $V but you need node v10.23.0"
    echo "execute the followind comand:"
    echo "$ nvm install v10.23.0 && nvm use v10.23.0"
    echo "";
    echo "";
    echo "";
    echo "";
    exit 1;
fi;
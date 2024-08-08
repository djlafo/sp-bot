THISDIR=$(dirname "$0")
forever -a -l $(pwd)/bot.log.txt -e $(pwd)/bot_error.txt -o $(pwd)/bot_output.txt start $THISDIR/bot.js

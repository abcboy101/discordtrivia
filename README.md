# discordtrivia
Trivia bot for Discord chat, v0.13

Instructions:
--------------
- Create file trivia.txt with your questions in the same directory as trivia.js.
- Enter the Discord username and password to be used on lines 4 and 5 of trivia.js.
- On Windows: Drag trivia.js to the node.exe file to run it. On other platforms, go to https://nodejs.org/en/download/ and download the proper binary for your system.
- Using Discord, type !start into the channel.
- When the round is complete or !stop is sent, the results for the round will be sent to a file named results<timestamp>.html.

By default, the trivia bot will ask 150 questions. Change the value of maxQuestionNum (line 15) to the number of questions you would like to ask. If there are fewer questions in the file than maxQuestionNum, the trivia bot will only ask the number of questions in the file.

If !start is sent again after the trivia has been stopped, it will scramble the questions again, start a new trivia round, and scores/players/etc. will be reset.

If the bot loses connection, it will dump the score table so far to results<timestamp>.html. As soon as it detects that it is able to connect, it will continue asking questions. If the bot is terminated during a loss of connection, paste the error info over lines 14 to 28 and start the bot. Afterwards, make sure to replace those values with the previous values.

Valid commands:
--------------
Use in the chat as the credentials provided or a user who can manage server
- !start:         starts a new round of trivia in the channel (only works in #trivia or #test channels)
- !stop:          ends the round of trivia
- !hint:          sends the question's hint now
- !skip:          skips the current question
- !list:          changes trivia list to the specified list
- !anyone start:  toggles ability of general users to use !start and !list
- !anyone stop:   toggles ability of general users to use !start, !stop, !hint, !skip, and !list

Anyone can use these in the chat
- !info:          sends a DM to the user who typed !info with their score and place
- !top:           sends a DM to the user who typed !top with the top ten and their scores
- !help:          sends a DM to the user who typed !help with information on commands they can use

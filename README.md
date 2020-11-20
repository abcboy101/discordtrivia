# discordtrivia
Trivia bot for Discord chat

Prerequisites:
--------------
- node.js (tested with v14)
- npm modules **discord.js** (v12), **path**, **readline**, and **request**

Settings:
--------------
The settings.txt file contains the current settings for the bot. All channel IDs should be enclosed in quotes.

- filepath:			(*string*) filepath to the file containing the trivia questions
- lang:				(*string*) localization file to use (setting this to "en" will use "local_en.txt")
- anyoneStart:		(*boolean*) whether non-privileged users can start the trivia
- anyoneStop:		(*boolean*) whether non-privileged users can stop the trivia
- anyoneAnswer:		(*boolean*) whether privileged users can answer the trivia
- autoDownload:		(*boolean*) whether the trivia file should be downloaded from the URL specified in "downloadUrl"
- tiebreaker:		(*boolean*) whether the trivia should continue past "maxQuestionNum" if there is a tie for first place
- tts:				(*boolean*) whether the bot should have TTS enabled on announcements
- startTime:		(*number*) time until the first question is asked after the trivia begins in milliseconds
- hintTime:			(*number*) time until the hint is given after a question is asked in milliseconds
- skipTime:			(*number*) time until the answer is given after a question is asked in milliseconds
- betweenTime:		(*number*) time until the next question is asked after an answer is given in milliseconds
- downloadUrl:		(*string*) *optional* URL of trivia questions to download (set to "" if not being used)
- maxQuestionNum:	(*number*) number of questions to ask before stopping the trivia (no greater than the number of questions in the trivia file)
- allowedChannels:	(*Array<string>*) array of channel names the bot can run in
- triviaChannel:	(*string*) *optional* ID of the text channel in which the trivia is to be held (set to "" if not being used, the bot will start in any channel whose name matches allowedChannels in which !start is typed)
- musicChannel:		(*string*) *optional* ID of the text channel in which music commands can be sent (integrates with SexualRhinoceros's MusicBot, set to "" if not being used)
- schedule:			(*Array<number>*) *optional* array of Unix timestamps (in ms) when the trivia should be started if not occuring at that time (set to [] if not being used)
- token:			(*string*) Discord auth token
- debug:			(*boolean*) enable debug logging

Instructions:
--------------
- Create a txt file with your questions in the same directory as trivia.js. The questions should be in the following format, with one question per line:
  - What is the fifth word in this question?\*word
- The first line of the file should be "<!-- DISCORD TRIVIA FILE -->"
- Create a Discord bot user and copy the token to settings.txt
- On Windows: Drag trivia.js to the node.exe file to run it. On other platforms, go to https://nodejs.org/en/download/ and download the proper binary for your system.
- Type !start into the command line or into the Discord trivia channel.
- When the round is complete or !stop is sent, the results for the round will be sent to a file named results<timestamp>.html.

If the bot loses connection, it will dump the score table so far to results<timestamp>.html. As soon as it detects that it is able to connect, it will continue asking questions. If the bot is terminated during a loss of connection, paste the error info over lines 55 to 64 of trivia.js and start the bot. Afterwards, make sure to replace those values with the previous values.

Localization:
--------------
local_en.txt comes with default messages in English and can be customized to suit your needs.

The "ordinals" value allows an array to define how rankings are displayed, starting with "0th", "1st", "2nd", and "3rd". Ordinal values beyond the end of the array will loop around. The "clean" and "typos" values use regex to clean answer input to compare to answers in the trivia file. The "special" value lists characters besides alphanumeric characters that should treated as letters for the hint with blanks. The "streakMsg" and "scoreMsg" values allow certain messages to be sent when a player reaches a certain score or streak.

"c"-group messages are displayed in the console. "d"-group messages are displayed in Discord, and may be displayed in the console. "t"-group messages are used in the construction of longer, complex messages.
 
Valid commands:
--------------
Use in the chat as the credentials provided or a user who can manage server
- !start:				starts a new round of trivia
- !stop:				ends the round of trivia
- !hint:				sends a hint for this question now
- !skip:				skips the current question
- !list *list*:			changes trivia list to the specified list
- !pause:				pauses the round of trivia
- !continue:			continues the round of trivia, if paused
- !exit:				terminates the bot
- !questions *number*:	changes number of questions to the specified number
- !echo:				repeats the message afterwards in the trivia channel
- !results:				sends a DM to you with the most recent results
- !download:			downloads the questions from the URL specified in settings.txt to the trivia
- !settings:			reloads settings from settings.txt
- !settings *filename*:	loads settings from the filename specified and saves the settings to settings.txt
- !disallow:			prevents a user from answering the trivia
- !allow:				allows a user to answer the trivia
- !anyone start:		toggles ability of general users to use !start and !list
- !anyone stop:			toggles ability of general users to use !stop, !hint, !skip, !pause, !continue, !questions, !download, !settings, !settings, !disallow, !allow, !anyone start, !anyone stop, !anyone answer, !reload, !timer, and !schedule
- !anyone answer:		toggles ability of privileged users to answer questions
- !reload:				toggles whether or not player data will be kept between rounds
- !timer:				sets a timer to start the trivia in the specified number of seconds
- !schedule:			sets a timer to start the trivia at the specifed Unix timestamp (in seconds)
- !emoji:				tests emoji in the trivia channel

Anyone can use these in the chat
- !info:				sends a DM to the user who typed !info with their score and place
- !top:					sends a DM to the user who typed !top with the top ten and their scores
- !help:				sends a DM to the user who typed !help with information on commands they can use
- !when:				sends a DM to the user who typed !when with the time of the next scheduled trivia round
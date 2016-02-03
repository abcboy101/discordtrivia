// Trivia bot for Discord chat, v0.14
// SET THESE YOURSELF
var filepath = "./trivia.txt";
var botUsername = "DISCORD USERNAME";
var botPassword = "DISCORD PASSWORD";
var anyoneStart = false;
var anyoneStop = false;
var startTime = 60000;
var hintTime = 30000;
var skipTime = 45000;
var betweenTime = 15000;

// SET THESE ONLY IF RESUMING A GAME
var questionNum = 1;
var maxQuestionNum = 150;
var lastRoundWinner = "null";
var roundWinnerScore = 0;
var roundWinnerStreak = 0;
var lastBestTimePlayer = "null";
var lastBestTime = 0;
var lastBestStreakPlayer = "null";
var lastBestStreak = 0;
var players = [];
var names = [];
var scores = [];
var streaks = [];
var times = [];
var bestTimes = [];

/* defaults

var questionNum = 1;
var maxQuestionNum = 150;
var lastRoundWinner = "0";
var roundWinnerScore = 0;
var roundWinnerStreak = 0;
var lastBestTimePlayer = "null";
var lastBestTime = 0;
var lastBestStreakPlayer = "null";
var lastBestStreak = 0;
var players = [];
var names = [];
var scores = [];
var streaks = [];
var times = [];
var bestTimes = [];

*/

var Discord = require("discord.js");
var fs = require("fs");
var mybot = new Discord.Client();
var trivia = false;
var startQuestionNum = questionNum;
var totalQuestions = 0;
var questionTimestamp = 0;
var answerArray = [];
var answered = true;
var questionTimeout;
var hintTimeout;
var skipTimeout;
var triviaChannel;
var allQuestionNum;
var attempts = 0;
var special = ["ß", "ç", "ð", "ñ", "ý", "ÿ", "à", "á", "â", "ã", "ä", "å", "æ", "è", "é", "ê", "ë", "ì", "í", "î", "ï", "ò", "ó", "ô", "õ", "ö", "ù", "ú", "û", "ü", "ẞ", "Ç", "Ð", "Ñ", "Ý", "Ÿ", "À", "Á", "Â", "Ã", "Ä", "Å", "Æ", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï", "Ò", "Ó", "Ô", "Õ", "Ö", "Ù", "Ú", "Û", "Ü"];

function getLine(line_no) {
	var data = fs.readFileSync("shuffled.txt", "utf8");
	var lines = data.split("\r\n");

	if(+line_no > lines.length){
		throw new Error("File end reached without finding line");
	}

	return lines[+line_no];
}

function startTrivia(message) {
	console.log("Started the trivia");
	randomizeQuestions();
	startQuestionNum = questionNum;
	if (totalQuestions === 0) {
		totalQuestions = maxQuestionNum - questionNum;
	} else { //if second round or after, initialize data
		questionNum = 0;
		players = [];
		names = [];
		scores = [];
		streaks = [];
		times = [];
	}
	mybot.sendMessage(message, "Attention, @everyone. The trivia round is starting. (" + totalQuestions + " questions out of " + allQuestionNum + ")", {tts: true});
	trivia = true;
	questionTimeout = setTimeout(askQuestion, startTime, message);
}

function endTrivia(message, finished) {
	clearTimeout(questionTimeout);
	clearTimeout(hintTimeout);
	clearTimeout(skipTimeout);
	if (finished) {
		mybot.sendMessage(message, "Attention, @everyone. " + totalQuestions + " questions have been reached. The trivia round is ending.", {tts: true});
	} else {
		mybot.sendMessage(message, "Attention, @everyone. The trivia round is ending.", {tts: true});
	}
	var bestStreak = streaks.indexOf(Math.max.apply(Math, streaks)); // get index of player with best streak
	var bestBestTime = bestTimes.indexOf(Math.min.apply(Math, bestTimes)); // get index of player with best best time
	var avgTimes = [];
	for (var i = 0; i < times.length; i++) {
		avgTimes.push(times[i] / scores[i]);
	}
	var bestAvgTime = avgTimes.indexOf(Math.min.apply(Math, avgTimes)); // get index of player with best average time

	mybot.sendMessage(message, "**1st Place**: <@" + players[0] + "> **Points**: " + scores[0] + " **Best streak**: " + streaks[0] + " **Avg. time**: " + (avgTimes[0] / 1000).toFixed(3) + " sec **Best time**: " + (bestTimes[0] / 1000).toFixed(3) + " sec\n**2nd Place**: <@" + players[1] + "> **Points**: " + scores[1] + " **Best streak**: " + streaks[1] + " **Avg. time**: " + (avgTimes[1] / 1000).toFixed(3) + " sec **Best time**: " + (bestTimes[1] / 1000).toFixed(3) + " sec\n**3rd Place**: <@" + players[2] + "> **Points**: " + scores[2] + " **Best streak**: " + streaks[2] + " **Avg. time**: " + (avgTimes[2] / 1000).toFixed(3) + " sec **Best time**: " + (bestTimes[2] / 1000).toFixed(3) + " sec\n\n**Best streak**: <@" + players[bestStreak] + "> with " + streaks[bestStreak] + "\n**Best time**: <@" + players[bestBestTime] + "> with " + (bestTimes[bestBestTime] / 1000).toFixed(3) + " sec\n**Best avg. time**: <@" + players[bestAvgTime] + "> with " + (avgTimes[bestAvgTime] / 1000).toFixed(3) + " sec");

	trivia = false;
	console.log("Stopped the trivia");
	console.log("1st Place: " + names[0] + " <@" + players[0] + "> Points: " + scores[0] + " Best time: " + bestTimes[0] / 1000);
	console.log("2nd Place: " + names[1] + " <@" + players[1] + "> Points: " + scores[1] + " Best time: " + bestTimes[1] / 1000);
	console.log("3rd Place: " + names[2] + " <@" + players[2] + "> Points: " + scores[2] + " Best time: " + bestTimes[2] / 1000);
	var outputFilename = "results" + Date.now() + ".html";
	fs.writeFileSync(outputFilename, "<html><head><title>Discord Trivia Bot Results</title></head>\n<body>\n<h1>Winners of round</h1>\n<p>(ended at " + (new Date()).toUTCString() + ")</p>\n<table border=\"1\">\n<tr><th>Rank</th><th>Name</th><th>User ID</th><th>Score</th><th>Best Streak</th><th>Best Time</th><th>Avg. Time</th></tr>");
	for (var i = 0; i < players.length; i++) {
		fs.appendFileSync(outputFilename, "\n<tr><td>" + getOrdinal(i + 1) + "</td><td>" + names[i] + "</td><td>&lt;@" + players[i] + "&gt;</td><td>" + scores[i] + "</td><td>" + streaks[i] + "</td><td>" + (bestTimes[i] / 1000).toFixed(3) + "</td><td>" + ((avgTimes[i]) / 1000).toFixed(3) + "</td></tr>");
	}
	fs.appendFileSync(outputFilename, "\n</table>\n<p>Discord Trivia Bot created by <a href=\"http://bulbapedia.bulbagarden.net/wiki/User:Abcboy\">abcboy</a></p>\n</body>\n</html>");
}

function randomizeQuestions() {
	var data = fs.readFileSync(filepath, "utf8").replace(/\\r\\n/g, "\n");
	var lines = data.split("\n");

	allQuestionNum = lines.length;
	for(var i = allQuestionNum - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = lines[i];
		lines[i] = lines[j];
		lines[j] = tmp;
	}
	lines = lines.join("\n");
	fs.writeFileSync("shuffled.txt", lines);
	console.log("Questions scrambled to shuffled.txt");

	if (maxQuestionNum > lines.length) {
		maxQuestionNum = allQuestionNum;
	}
}

function parseAnswer(answer, correct) {
	function clean(unclean) {
		return unclean.toLowerCase().trim().replace(/ß/g,"ss").replace(/à/g,"a").replace(/á/g,"a").replace(/â/g,"a").replace(/ã/g,"a").replace(/ä/g,"a").replace(/å/g,"a").replace(/æ/g,"ae").replace(/ç/g,"c").replace(/ð/g,"d").replace(/è/g,"e").replace(/é/g,"e").replace(/ê/g,"e").replace(/ë/g,"e").replace(/ì/g,"i").replace(/í/g,"i").replace(/î/g,"i").replace(/ï/g,"i").replace(/ñ/g,"n").replace(/ò/g,"o").replace(/ó/g,"o").replace(/ô/g,"o").replace(/õ/g,"o").replace(/ö/g,"o").replace(/ù/g,"u").replace(/ú/g,"u").replace(/û/g,"u").replace(/ü/g,"u").replace(/ý/g,"y").replace(/ÿ/g,"y").replace(/&/g,"and").replace(/-/g," ").replace(/ +(?= )/g,"").replace(/[^a-zA-Z0-9 ]/g, "");
	}
	function cleanTypos(unclean) {
		return unclean.replace(/kn/g,"n").replace(/y/g,"i").replace(/k/g,"c").replace(/x/g,"c").replace(/q/g,"c").replace(/e/g,"a").replace(/ah/g,"a").replace(/u/g,"o").replace(/ph/g,"f").replace(/m/g,"n").replace(/ll/g,"l").replace(/aa/g,"a").replace(/oo/g,"o").replace(/cc/g,"c").replace(/z/g,"s");
	}
	// string is lowercased, trimmed, and multiple spaces removed, é is turned to e, & is turned to and, all non-alphanumeric characters removed
	var cleanAnswer = clean(answer);
	for (var i = 0; i < correct.length; i++) {
		// each answer choice is cleaned and compared
		if ((cleanAnswer === clean(correct[i])) || (cleanTypos(cleanAnswer) === cleanTypos(clean(correct[i])))) {
			return true;
		}
	}
	return false;
}

function askQuestion(message) {
	if (questionNum < maxQuestionNum && trivia) {
		if (attempts > 0) {
			mybot.login(botUsername, botPassword);
			if (answered === false) {
				mybot.sendMessage(message, "The last question has been skipped due to connectivity issues. No points will be awarded for it.");
				answered = true;
			}
		}

		var line = getLine(questionNum);
		questionNum++;
		var questionText = line.substring(0,line.indexOf("*")).replace(/_/g,"\\_");
		answerArray = line.substring(line.indexOf("*")+1).split("*");

		mybot.sendMessage(message, (questionNum - startQuestionNum).toString() + ". **" + questionText + "**", {tts: false}, function(error,questionMessage){
			if (error) {
				reconnect();
				questionNum--;
			} else {
				attempts = 0;
				console.log(questionText);
				console.log(answerArray);
				answered = false;
				questionTimestamp = questionMessage.timestamp;
				console.log(questionTimestamp);
				hintTimeout = setTimeout(hint, hintTime, message);
				skipTimeout = setTimeout(skipQuestion, skipTime, message);
			}
		});
	}
	else {
		endTrivia(message, true);
	}
}

function hint(message) {
	var hintType = Math.floor(Math.random() * 3); // 3 types of hint (0, 1, 2)
	var roundHint;
	if (answerArray[0].length < 3) { // if 2 letters or shorter, length hint
		roundHint = answerArray[0].length;
		mybot.sendMessage(message, "**Here's a hint** (no. of characters): " + roundHint);
	} else if (answerArray[0].length < 5) { // if 4 letters or shorter, last letter hint
		roundHint = answerArray[0].slice(-1);
		mybot.sendMessage(message, "**Here's a hint** (last character): " + roundHint);
	} else if (hintType === 0) { //scramble the hint
		roundHint = hintScramble();
		mybot.sendMessage(message, "**Here's a hint** (scrambled): " + roundHint);
	} else if (hintType === 1) { //replace 90% with blanks
		roundHint = hintBlanks();
		mybot.sendMessage(message, "**Here's a hint** (fill in the blanks): " + roundHint);
	} else if (hintType === 2) { // fill in the non-vowels
		roundHint = answerArray[0].replace(/[b-df-hj-np-tv-zB-DF-HJ-NP-TV-Z0-9ßçðñýÿẞÇÐÑÝŸ]/g,"\\_");
		if (roundHint === answerArray[0] || roundHint === answerArray[0].replace(/[a-zA-Z0-9ßçðñýÿàáâãäåæèéêëìíîïòóôõöùúûüẞÇÐÑÝŸÀÁÂÃÄÅÆÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]/g,"\\_")) { //if hint has no vowels or is all vowels
			if (Math.random < 0.5) { // fill in the blanks
				roundHint = hintBlanks();
				mybot.sendMessage(message, "**Here's a hint** (fill in the blanks): " + roundHint);
			} else { // scrambled hint
				roundHint = hintScramble();
				mybot.sendMessage(message, "**Here's a hint** (scrambled): " + roundHint);
			}
		} else {
			mybot.sendMessage(message, "**Here's a hint** (vowels): " + roundHint);
		}
	}
	console.log(roundHint);
}

function hintScramble() {
	var scrambled = answerArray[0].split(" "),
		n = scrambled.length;
	for(var i = n - 1; i >= 0; i--) {
		var scrambledWord = scrambled[i].split(""),
			m = scrambledWord.length;
		for(var j = m - 1; j > 0; j--) {
			var k = Math.floor(Math.random() * (j + 1));
			var tmp = scrambledWord[j];
			scrambledWord[j] = scrambledWord[k];
			scrambledWord[k] = tmp;
		}
		scrambled[i] = scrambledWord.join("");
	}
	return scrambled.join(" ");
}

function hintBlanks() {
	var blanks = "";
	var s = answerArray[0].split("");
	for(var i = 0;i<s.length;i++){
		var code = s[i].charCodeAt(0);
		// first character is never shown, last character is always shown
		if (i === 0 || ((i !== s.length - 1) && (Math.random() < 0.9) && ((code > 47 && code < 58) || (code > 64 && code < 91) || (code > 96 && code < 123) || (special.indexOf(s[i]) !== -1)))) { // if part of the 90% and alphanumeric or special
			blanks += "\\_";
		}
		else {
			blanks += s[i];
		}
	}
	return blanks;
}

function skipQuestion(message) {
	mybot.sendMessage(message, "*Time's up!* **Answer**: " + answerArray[0], {tts: false}, function(error, timestamp){
		if (error) {
			reconnect();
		} else {
			lastRoundWinner = "null";
			answered = true;
			questionTimeout = setTimeout(askQuestion, betweenTime, message);
		}
	});
}

function getOrdinal(n) {
	var s=["th","st","nd","rd"],
		v=n%100;
	return n+(s[(v-20)%10]||s[v]||s[0]);
}

function sortByArray(sortThis, sortBy) {
	var newArray = sortThis;
	newArray.sort(function(a, b) {
		return sortBy[sortThis.indexOf(b)] - sortBy[sortThis.indexOf(a)];
	});
	return newArray;
}

function reconnect() {
	if (attempts === 0) {
		clearTimeout(questionTimeout);
		clearTimeout(hintTimeout);
		clearTimeout(skipTimeout);

		var outputFilename = "results" + Date.now() + ".html";
		fs.writeFileSync(outputFilename, "<html><head><title>Discord Trivia Bot Results</title></head>\n<body>\n<h1>Winners of round</h1>\n<p style=\"color: red\">(aborted at " + (new Date()).toUTCString() + ")</p>\n<table border=\"1\">\n<tr><th>Rank</th><th>Name</th><th>User ID</th><th>Score</th><th>Best Streak</th><th>Best Time</th><th>Avg. Time</th></tr>");
		for (var i = 0; i < players.length; i++) {
			fs.appendFileSync(outputFilename, "\n<tr><td>" + getOrdinal(i + 1) + "</td><td>" + names[i] + "</td><td>&lt;@" + players[i] + "&gt;</td><td>" + scores[i] + "</td><td>" + streaks[i] + "</td><td>" + (bestTimes[i] / 1000).toFixed(3) + "</td><td>" + ((times[i] / scores[i]) / 1000).toFixed(3) + "</td></tr>");
		}
		fs.appendFileSync(outputFilename, "\n</table>\n<p>Discord Trivia Bot created by <a href=\"http://bulbapedia.bulbagarden.net/wiki/User:Abcboy\">abcboy</a></p>\n<h2>Error info:</h2><ul>");
		fs.appendFileSync(outputFilename, "\n<li>var questionNum = " + questionNum + ";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var maxQuestionNum = " + maxQuestionNum + ";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var lastRoundWinner = \"" + lastRoundWinner + "\";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var roundWinnerScore = " + roundWinnerScore + ";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var roundWinnerStreak = " + roundWinnerStreak + ";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var lastBestTimePlayer = \"" + lastBestTimePlayer + "\";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var lastBestTime = " + lastBestTime + ";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var lastBestStreakPlayer = \"" + lastBestStreakPlayer + "\";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var lastBestStreak = " + lastBestStreak + ";</li>");
		fs.appendFileSync(outputFilename, "\n<li>var players = [\"" + players.join("\",\"") + "\"];</li>");
		fs.appendFileSync(outputFilename, "\n<li>var names = [\"" + names.join("\",\"") + "\"];</li>");
		fs.appendFileSync(outputFilename, "\n<li>var scores = [" + scores.join(",") + "];</li>");
		fs.appendFileSync(outputFilename, "\n<li>var streaks = [" + streaks.join(",") + "];</li>");
		fs.appendFileSync(outputFilename, "\n<li>var times = [" + times.join(",") + "];</li>");
		fs.appendFileSync(outputFilename, "\n<li>var bestTimes = [" + bestTimes.join(",") + "];</li></ul>");
		fs.appendFileSync(outputFilename, "\n</body>\n</html>");
		console.log("Connection lost. Existing score data has been dumped.");
		questionTimeout = setTimeout(askQuestion, 10000, triviaChannel);
		console.log("Attempting to reconnect in 10 seconds...");
	} else {
		questionTimeout = setTimeout(askQuestion, 10000, triviaChannel);
		console.log("Attempt failed. Attempting to reconnect in 10 seconds...");
	}
	attempts++;
}

mybot.on("error", function(error){
	throw error;
});

mybot.on("message", function(message){
	// if anyone says "!info" in the chat or DM it, they get a DM with their current score and place
	if (message.content === "!info") {
		mybot.deleteMessage(message);
		var authorIndex = players.indexOf(message.author.id);
		var score = scores[authorIndex];
		var streak = streaks[authorIndex];
		var place = getOrdinal(authorIndex + 1);
		var bestTime = bestTimes[authorIndex];
		var time = times[authorIndex];
		var avgTime = (time / score / 1000).toFixed(3);
		if (typeof score === "undefined") { // if the user hasn't played
			score = "0";
			streak = 0;
			place = "—";
			bestTime = 0;
			avgTime = "—";
		}
		mybot.sendMessage(message.author, "Your info:\n**Points**: " + score + " **Place**: " + place + " **Best streak**: " + streak + " **Best time**: " + (bestTime / 1000).toFixed(3) + " sec **Avg. time**: " + avgTime + " sec");
	}

	// if anyone says "!top" in the chat or DM it, they get a DM with the top ten
	else if (message.content === "!top") {
		mybot.deleteMessage(message);
		var place = 0;
		var topTen = "Top ten:";
		if (players.length === 0) {
			topTen = topTen + "\nNo one yet."
		}
		while ((place < 10) && (place < players.length)) {
			topTen = topTen + "\n**" + getOrdinal(place + 1) + " Place**: <@" + players[place] + "> **Points**: " + scores[place] + " **Best streak**: " + streaks[place] + " **Best time**: " + (bestTimes[place] / 1000).toFixed(3) + " sec **Avg. time**: " + (times[place] / scores[place] / 1000).toFixed(3) + " sec";
			place++;
		}
		mybot.sendMessage(message.author, topTen);
	}

	// if anyone says "!help" in the chat or DM it, they get a DM with valid commands
	else if (message.content === "!help") {
		mybot.deleteMessage(message);
		if (anyoneStop || (message.author.id === mybot.user.id) || (message.channel.permissionsOf(message.author).hasPermission("manageServer"))) {
			mybot.sendMessage(message.author, "Commands:\n- **!start**: starts the round of trivia\n- **!stop**: ends the round of trivia\n- **!hint**: sends the question's hint now\n- **!skip**: skips the current question\n- **!list** *list*: changes trivia list to the specified list\n- **!anyone start**: toggles ability to use !start and !list\n- **!anyone stop**: toggles ability to use !start, !stop, !hint, !skip, and !list\n- **!anyone answer**: toggles ability for server staff to answer\n- **!info**: sends a DM to you with your score and place\n- **!top**: sends a DM to you with the top ten and their scores\n- **!help**: sends a DM to you with information on commands you can use");
		}
		else if (anyoneStart) {
			mybot.sendMessage(message.author, "Commands:\n- **!start**: starts the round of trivia\n- **!list** *list*: changes trivia list to the specified list\n- **!info**: sends a DM to you with your score and place\n- **!top**: sends a DM to you with the top ten and their scores\n- **!help**: sends a DM to you with information on commands you can use");
		}
		else {
			mybot.sendMessage(message.author, "Commands:\n- **!info**: sends a DM to you with your score and place\n- **!top**: sends a DM to you with the top ten and their scores\n- **!help**: sends a DM to you with information on commands you can use");
		}
	}

	// only executes if in chat channel trivia or test
	else if (message.channel.name === "trivia" || message.channel.name === "test") {
		var privileged = message.channel.permissionsOf(message.author).hasPermission("manageServer");

		// only if Rapidash Trivia or people who can manage server types, or if anyoneStart is true
		if (anyoneStart || privileged || (message.author.id === mybot.user.id)) {

			if (!trivia && message.content === "!start"){ // starts the trivia
				triviaChannel = message.channel;
				mybot.deleteMessage(message);
				startTrivia(message);
			} else if (!trivia && message.content.split(" ")[0] === "!list"){ // changes trivia list
				mybot.deleteMessage(message);
				filepath = "./" + message.content.substr(6).trim();
				console.log("Trivia list changed to " + filepath);
			}
		}

		// only if Rapidash Trivia or people who can manage server types, or if anyoneStop is true
		if (anyoneStop || privileged || (message.author.id === mybot.user.id)) {
			if (trivia && message.content === "!stop"){ // stops the trivia
				mybot.deleteMessage(message);
				endTrivia(message, false);
			} else if (!answered && message.content === "!hint"){ // gives the hint now
				mybot.deleteMessage(message);
				clearTimeout(hintTimeout);
				hint(message);
			} else if (!answered && message.content === "!skip"){ // skips the question
				mybot.deleteMessage(message);
				clearTimeout(hintTimeout);
				clearTimeout(skipTimeout);
				skipQuestion(message);
			} else if (message.content === "!anyone start"){ // anyone can start the trivia
				mybot.deleteMessage(message);
				anyoneStart = !anyoneStart;
				if (anyoneStart) {
					anyoneStop = false;
					mybot.sendMessage(message, "*Anyone can start the trivia*");
					console.log("Anyone can start the trivia");
				} else {
					anyoneStop = false;
					mybot.sendMessage(message, "*Only server staff can start or stop the trivia*");
					console.log("Only server staff can start or stop the trivia");
				}
			} else if (message.content === "!anyone stop"){ // anyone can stop the trivia
				mybot.deleteMessage(message);
				anyoneStop = !anyoneStop;
				anyoneStart = anyoneStop;
				if (anyoneStop) {
					mybot.sendMessage(message, "*Anyone can start or stop the trivia*");
					console.log("Anyone can start or stop the trivia");
				} else {
					mybot.sendMessage(message, "*Only server staff can start or stop the trivia*");
					console.log("Only server staff can start or stop the trivia");
				}
			} else if (message.content === "!anyone answer"){ // anyone can start the trivia
				mybot.deleteMessage(message);
				anyoneAnswer = !anyoneAnswer;
				if (anyoneAnswer) {
					mybot.sendMessage(message, "*Anyone can answer the trivia*");
					console.log("Anyone can answer the trivia");
				} else {
					mybot.sendMessage(message, "*Server staff cannot answer the trivia*");
					console.log("Server staff cannot answer the trivia");
				}
			} else if (!answered && !anyoneAnswer && privileged && parseAnswer(message.content, answerArray)) {
				mybot.deleteMessage(message);
			}
		}

		// if answer is correct
		if (!answered && (anyoneAnswer || !privileged) && parseAnswer(message.content, answerArray)) {
			var timeTaken = message.timestamp - questionTimestamp;
			if (timeTaken < 1500 || timeTaken > skipTime || 12000 * message.content.length / timeTaken > 120) { //if they answer in less than 1500 ms, before the question is sent to the server, or WPM is greater than 120
				console.log("*@" + message.author.username + " " + message.author.mention() + " has been banned for suspicious activity* (answered in " + timeTaken + " ms, WPM was " + (12000 * message.content.length / timeTaken).toFixed() + ")");
				mybot.banMember(message.author, message.channel.server, 0);
				mybot.sendMessage(message.channel, "*" + message.author.mention() + " has been banned for suspicious activity*");
				mybot.sendMessage(message.author, "*You have been banned for suspicious activity*");
				mybot.deleteMessage(message);
			} else {
				clearTimeout(hintTimeout);
				clearTimeout(skipTimeout);
				var oldRank;
				if (players.indexOf(message.author.id) === -1) { // if player hasn't won before
					players.push(message.author.id);
					names.push(message.author.username);
					scores.push(1);
					streaks.push(1);
					times.push(timeTaken);
					bestTimes.push(timeTaken);
					oldRank = players.length + 1; // rank + 1 to force message
					roundWinnerScore = 1;
					roundWinnerStreak = 1;
				} else { // if player has won before
					var winnerIndex = players.indexOf(message.author.id);
					oldRank = winnerIndex + 1;
					scores[winnerIndex]++;
					roundWinnerScore = scores[winnerIndex];
					times[winnerIndex] += timeTaken;

					if (lastRoundWinner === message.author.id) { // if winner of this and last round are the same
						roundWinnerStreak++;
						if (roundWinnerStreak > streaks[winnerIndex]) { // if this is a longer streak than old best streak
							streaks[winnerIndex] = roundWinnerStreak;
						}
						if (roundWinnerStreak > 5) {
							mybot.sendMessage(message, "*" + message.author.mention() + " stretches their streak to " + roundWinnerStreak + "!*");
						}
					} else {
						if (roundWinnerStreak > 5) {
							mybot.sendMessage(message, "*<@" + lastBestStreakPlayer + ">'s  streak ended at " + roundWinnerStreak + " by " + message.author.mention() + "*");
						}
						roundWinnerStreak = 1;
					}

					if (timeTaken < bestTimes[winnerIndex]) { // if this is a better time than old best time
						bestTimes[winnerIndex] = timeTaken;
					}
					players = sortByArray(players,scores);
					names = sortByArray(names,scores);
					streaks = sortByArray(streaks,scores);
					times = sortByArray(times,scores);
					bestTimes = sortByArray(bestTimes,scores);
					scores.sort(function(a, b) {
					return b - a;
					});
				}

				var rank = players.indexOf(message.author.id) + 1;

				// say correct answer and who entered it
				mybot.sendMessage(message, "**Winner**: " + message.author.mention() + " **Answer**: " + answerArray[0] + " **Points**: " + roundWinnerScore + " **Place**: " + getOrdinal(rank) + " **Streak**: " + roundWinnerStreak + " **Time**: " + (timeTaken / 1000).toFixed(3) + " sec");
				console.log("Winner: " + message.author.username + " " + message.author.mention() + " Answer: " + message.content + " Points: " + roundWinnerScore + " Place: " + getOrdinal(rank) + " Streak: " + roundWinnerStreak + " Time: " + (timeTaken / 1000).toFixed(3) + " sec");

				// sends message if they moved up in rank
				if (rank < oldRank) {
					mybot.sendMessage(message, "*" + message.author.mention() + " has moved up in rank* (" + getOrdinal(rank) + ")");
				}

				// keep track of time record for current round
				if (lastBestTimePlayer === "null") { // if there is no best time yet
					lastBestTimePlayer = message.author.id;
					lastBestTime = timeTaken;
				} else if (timeTaken < lastBestTime) { // if the player beat the last best time
					mybot.sendMessage(message, "*" + message.author.mention() + " broke the current round time record with " + (timeTaken / 1000).toFixed(3) + " sec! Previous record holder was <@" + lastBestTimePlayer + "> with " + (lastBestTime / 1000).toFixed(3) + " sec!*");
					lastBestTimePlayer = message.author.id;
					lastBestTime = timeTaken;
				}

				// keep track of streak record for current round
				if (lastBestStreakPlayer === "null") { // if there is no best streak yet
					lastBestStreakPlayer = message.author.id;
					lastBestStreak = roundWinnerStreak;
				} else if (roundWinnerStreak > lastBestStreak) { // if the player beat the last best streak
					if (lastBestStreakPlayer !== message.author.id) {
						mybot.sendMessage(message, "*" + message.author.mention() + " broke the current round streak record with " + roundWinnerStreak + "! Previous record holder was <@" + lastBestStreakPlayer + "> with " + lastBestStreak + "!*");
					}
					lastBestStreakPlayer = message.author.id;
					lastBestStreak = roundWinnerStreak;
				}

				// sends message based on streak
				switch (roundWinnerStreak) {
					case 3:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " hands " + message.author.mention() + " a jelly-filled donut for getting the last 3 questions!*");
						break;
					case 5:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " hands " + message.author.mention() + " a diploma for getting the last 5 questions!*");
						break;
					case 10:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " watches " + message.author.mention() + " speed away from their competitors, kicking their asses! 10 questions!*");
						break;
					case 15:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " bows before " + message.author.mention() + " who is a trivia Legendary Pokémon...*");
						break;
					case 25:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " bows before " + message.author.mention() + " who knows more about Pokémon than Arceus...*");
						break;
				}

				// sends message based on points
				switch (roundWinnerScore) {
					case 50:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " rewards " + message.author.mention() + " with a Ratatta in the top percentage of all Rattata!*");
						break;
					case 100:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " rewards " + message.author.mention() + " with some shorts that are comfy and easy to wear!*");
						break;
					case 150:
						mybot.sendMessage(message, "*" + mybot.user.mention() + " rewards " + message.author.mention() + " with a Helix Fossil!*");
						break;
				}

				lastRoundWinner = message.author.id;
				answered = true;
				questionTimeout = setTimeout(askQuestion, betweenTime, message);
			}
		}
	}
});

questionNum -= 1;
mybot.login(botUsername, botPassword);
console.log("The trivia bot has been started.");

// exit handling stuff
process.stdin.resume();

function exitHandler() {
	mybot.sendMessage(triviaChannel, "Attention, @everyone. The trivia bot has been terminated.", {tts: true}, function(error, message){
		if (trivia) {
			var outputFilename = "results" + Date.now() + ".html";
			fs.writeFileSync(outputFilename, "<html><head><title>Discord Trivia Bot Results</title></head>\n<body>\n<h1>Winners of round</h1>\n<p style=\"color: red\">(aborted at " + (new Date()).toUTCString() + ")</p>\n<table border=\"1\">\n<tr><th>Rank</th><th>Name</th><th>User ID</th><th>Score</th><th>Best Streak</th><th>Best Time</th><th>Avg. Time</th></tr>");
			for (var i = 0; i < players.length; i++) {
				fs.appendFileSync(outputFilename, "\n<tr><td>" + getOrdinal(i + 1) + "</td><td>" + names[i] + "</td><td>&lt;@" + players[i] + "&gt;</td><td>" + scores[i] + "</td><td>" + streaks[i] + "</td><td>" + (bestTimes[i] / 1000).toFixed(3) + "</td><td>" + ((times[i] / scores[i]) / 1000).toFixed(3) + "</td></tr>");
			}
			fs.appendFileSync(outputFilename, "\n</table>\n<p>Discord Trivia Bot created by <a href=\"http://bulbapedia.bulbagarden.net/wiki/User:Abcboy\">abcboy</a></p>\n<h2>Error info:</h2><ul>");
			fs.appendFileSync(outputFilename, "\n<li>var questionNum = " + questionNum + ";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var maxQuestionNum = " + maxQuestionNum + ";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var lastRoundWinner = \"" + lastRoundWinner + "\";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var roundWinnerScore = " + roundWinnerScore + ";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var roundWinnerStreak = " + roundWinnerStreak + ";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var lastBestTimePlayer = \"" + lastBestTimePlayer + "\";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var lastBestTime = " + lastBestTime + ";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var lastBestStreakPlayer = \"" + lastBestStreakPlayer + "\";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var lastBestStreak = " + lastBestStreak + ";</li>");
			fs.appendFileSync(outputFilename, "\n<li>var players = [\"" + players.join("\",\"") + "\"];</li>");
			fs.appendFileSync(outputFilename, "\n<li>var names = [\"" + names.join("\",\"") + "\"];</li>");
			fs.appendFileSync(outputFilename, "\n<li>var scores = [" + scores.join(",") + "];</li>");
			fs.appendFileSync(outputFilename, "\n<li>var streaks = [" + streaks.join(",") + "];</li>");
			fs.appendFileSync(outputFilename, "\n<li>var times = [" + times.join(",") + "];</li>");
			fs.appendFileSync(outputFilename, "\n<li>var bestTimes = [" + bestTimes.join(",") + "];</li></ul>");
			fs.appendFileSync(outputFilename, "\n</body>\n</html>");
		}
		console.log("The trivia bot has been terminated.");
		process.exit();
	});
}

process.on('exit', exitHandler.bind(null));
process.on('SIGINT', exitHandler.bind(null));
process.on('uncaughtException', exitHandler.bind(null));

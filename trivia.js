// Trivia bot for Discord chat, v0.50.0-alpha
const Discord = require("discord.js");
const fs = require("fs");
const path = require("path");
const request = require("request");
const readline = require("readline");
const crypto = require("crypto");
const bot = new Discord.Client();
const rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt("");

var versionString = "0.50.0-alpha";
console.log("The trivia bot has been launched. (v" + versionString + ")");

// load settings from settings.txt
var settings = {};
var local = {};
try {
	settings = JSON.parse(`{${fs.readFileSync("settings.txt", "utf8").replace(/^\uFEFF/, '')}}`);
	console.log("settings.txt loaded");
} catch(err) {
	console.log("settings.txt error! Loading default settings...");
	settings = {
		filepath: "trivia.txt",
		lang: "en",
		anyoneStart: false,
		anyoneStop: false,
		anyoneAnswer: false,
		autoDownload: false,
		tiebreaker: false,
		containsAnswer: false,
		tts: false,
		startTime: 60000,
		hintTime: 30000,
		skipTime: 45000,
		betweenTime: 15000,
		downloadUrl: "null",
		maxQuestionNum: 150,
		allowedChannels: ["trivia"],
		triviaChannel: "",
		musicChannel: "",
		schedule: [],
		token: "",
		debug: false
	}
}

try {
	local = JSON.parse("{" + fs.readFileSync("local_" + settings.lang + ".txt", "utf8").replace(/^\uFEFF/, '') + "}");
	console.log(localize("c_langLoaded"));
} catch(err) {
	console.log(`local_${settings.lang}.txt error! Check for errors in the file.`);
	process.exit();
}

var reload = false;
var questionNum = 1;
var lastRoundWinner = "null";
var roundWinnerScore = 0;
var roundWinnerStreak = 0;
var lastBestTimePlayer = "null";
var lastBestTime = 0;
var lastBestStreakPlayer = "null";
var lastBestStreak = 0;
var players = [];

/* defaults

var reload = false;
var questionNum = 1;
var lastRoundWinner = "null";
var roundWinnerScore = 0;
var roundWinnerStreak = 0;
var lastBestTimePlayer = "null";
var lastBestTime = 0;
var lastBestStreakPlayer = "null";
var lastBestStreak = 0;
var players = [];

*/

var trivia = false;
var paused = false;
var exit = false;
var startQuestionNum = questionNum;
var questionTimestamp = 0;
var answerText = "";
var answerImage = "";
var answerMusic = "";
var answerArray = [];
var answered = true;
var questionTimeout;
var hintTimeout;
var skipTimeout;
var typeTimeout;
var triviaTimeout;
var scheduleTimeout;
var when = -1;
var triviaChannel;
var musicChannel;
var allQuestionNum;
var tieQuestionNum = 0;
var attempts = 0;
var topTen = localize("d_topTenDefault");
var resultsFilename = "";

function getLine(line_no) {
	var data = fs.readFileSync("shuffled.txt", "utf8");
	var lines = data.split("\n");

	if(+line_no > lines.length){
		throw new Error("File end reached without finding line");
	}

	return lines[+line_no];
}

function localize(line, arg1a, arg1b, arg2a, arg2b, arg3a, arg3b, arg4a, arg4b) {
	var data = local[line];
	if (!arg1a || !arg1b) {
		return eval("`" + data + "`");

		} else if (!arg2a || !arg2b) {
		arg1a = arg1a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		return eval("`" + data.replace(new RegExp(arg1a, "g"), arg1b) + "`");
	} else if (!arg3a || !arg3b) {
		arg1a = arg1a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		arg2a = arg2a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		return eval("`" + data.replace(new RegExp(arg1a, "g"), arg1b).replace(new RegExp(arg2a, "g"), arg2b) + "`");
	} else if (!arg4a || !arg4b) {
		arg1a = arg1a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		arg2a = arg2a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		arg3a = arg3a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		return eval("`" + data.replace(new RegExp(arg1a, "g"), arg1b).replace(new RegExp(arg2a, "g"), arg2b).replace(new RegExp(arg3a, "g"), arg3b) + "`");
	} else {
		arg1a = arg1a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		arg2a = arg2a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		arg3a = arg3a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		arg4a = arg4a.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		return eval("`" + data.replace(new RegExp(arg1a, "g"), arg1b).replace(new RegExp(arg2a, "g"), arg2b).replace(new RegExp(arg3a, "g"), arg3b).replace(new RegExp(arg4a, "g"), arg4b) + "`");
	}
}

function deleteMessage(message) {
	if(message.channel.type === "text" && message.channel.permissionsFor(bot.user).has("MANAGE_MESSAGES")) {
		message.delete();
	}
}

function startTrivia() {
	clearTimeout(scheduleTimeout);
	clearTimeout(triviaTimeout);
	console.log(localize("c_start"));
	
	questionNum = 0;
	startQuestionNum = 0;
	tieQuestionNum = 0;
	if (!reload) {
		lastRoundWinner = "null";
		roundWinnerScore = 0;
		roundWinnerStreak = 0;
		lastBestTimePlayer = "null";
		lastBestTime = 0;
		lastBestStreakPlayer = "null";
		lastBestStreak = 0;
		players = [];
		topTen = localize("d_topTenDefault");
	}
	
	bot.user.setPresence({status: "online", activity: {type: "PLAYING", name: localize("d_game")}});
	triviaChannel.send(localize("d_start"), {tts: settings.tts});
	trivia = true;
	questionTimeout = setTimeout(askQuestion, settings.startTime);
	typeTimeout = setTimeout(function(){
		if (trivia) {
			triviaChannel.startTyping();
		}
	}, Math.max(settings.startTime - 5000, 0));
	
	if (musicChannel) {
		musicChannel.send("~clear").then(message => {
			musicChannel.send("~skip").then(message => {
				musicChannel.send("~skip");
		})});
	}
}

function endTrivia(finished) {
	clearTimeout(questionTimeout);
	clearTimeout(hintTimeout);
	clearTimeout(skipTimeout);
	clearTimeout(typeTimeout);
	clearTimeout(scheduleTimeout);
	outputScores(false);

	triviaChannel.stopTyping();
	
	if (trivia) {
		if (finished) {
			triviaChannel.send(localize("d_end"), {tts: settings.tts});
		} else {
			triviaChannel.send(localize("d_stop"), {tts: settings.tts});
		}
		
		var streaks = players.map(function(a) {
			return a.streak;
		});
		var bestTimes = players.map(function(a) {
			return a.bestTime;
		});
		var avgTimes = players.map(function(a) {
			return a.time / a.score;
		});
		
		var bestStreak = streaks.indexOf(Math.max.apply(Math, streaks)); // get index of player with best streak
		var bestBestTime = bestTimes.indexOf(Math.min.apply(Math, bestTimes)); // get index of player with best best time
		var bestAvgTime = avgTimes.indexOf(Math.min.apply(Math, avgTimes)); // get index of player with best average time

		if (players.length > 0) {
			triviaChannel.send(((typeof players[0] !== "undefined") ? `**${localize("t_first")}**: <@${players[0].id}> **${localize("t_points")}**: ${players[0].score} **${localize("t_bestStreak")}**: ${players[0].streak} **${localize("t_avgTime")}**: ${(players[0].time / players[0].score / 1000).toFixed(3)} ${localize("t_sec")} **${localize("t_bestTime")}**: ${(players[0].bestTime / 1000).toFixed(3)} ${localize("t_sec")}\n` + ((typeof players[1] !== "undefined") ? `**${localize("t_second")}**: <@${players[1].id}> **${localize("t_points")}**: ${players[1].score} **${localize("t_bestStreak")}**: ${players[1].streak} **${localize("t_avgTime")}**: ${(players[1].time / players[1].score / 1000).toFixed(3)} ${localize("t_sec")} **${localize("t_bestTime")}**: ${(players[1].bestTime / 1000).toFixed(3)} ${localize("t_sec")}\n` : "") + ((typeof players[2] !== "undefined") ? `**${localize("t_third")}**: <@${players[2].id}> **${localize("t_points")}**: ${players[2].score} **${localize("t_bestStreak")}**: ${players[2].streak} **${localize("t_avgTime")}**: ${(players[2].time / players[2].score / 1000).toFixed(3)} ${localize("t_sec")} **${localize("t_bestTime")}**: ${(players[2].bestTime / 1000).toFixed(3)} ${localize("t_sec")}\n` : "") + `\n**${localize("t_bestBestStreak")}**: <@${players[bestStreak].id}> ${localize("t_with")} ${players[bestStreak].streak}\n**${localize("t_bestBestTime")}**: <@${players[bestBestTime].id}> ${localize("t_with")} ${(players[bestBestTime].bestTime / 1000).toFixed(3)} ${localize("t_sec")}\n**${localize("t_bestAvgTime")}**: <@${players[bestAvgTime].id}> ${localize("t_with")} ${(players[bestAvgTime].time / players[bestAvgTime].score / 1000).toFixed(3)} ${localize("t_sec")}` : ""));
			bot.users.fetch(players[0].id).then((user) => {
				user.send(localize("d_winner"));
			});
		}
	}
	
	trivia = false;
	bot.user.setPresence({status: "idle", activity: {type: 0, name: ""}});
	console.log(localize("c_stop"));
	console.log(localize("t_first") + ": " + ((typeof players[0] !== "undefined") ? `${players[0].name} <@${players[0].id}> ${localize("t_points")}: ${players[0].score} ${localize("t_bestTime")}: ${players[0].bestTime / 1000}` : localize("t_noOne")));
	console.log(localize("t_second") + ": " + ((typeof players[1] !== "undefined") ? `${players[1].name} <@${players[1].id}> ${localize("t_points")}: ${players[1].score} ${localize("t_bestTime")}: ${players[1].bestTime / 1000}` : localize("t_noOne")));
	console.log(localize("t_third") + ": " + ((typeof players[2] !== "undefined") ? `${players[2].name} <@${players[2].id}> ${localize("t_points")}: ${players[2].score} ${localize("t_bestTime")}: ${players[2].bestTime / 1000}` : localize("t_noOne")));
	
	checkSchedule();
}

function outputScores(debug) {	
	var outputFilename = `results${Date.now()}.html`;
	resultsFilename = "";
	
	fs.writeFileSync(`results${Date.now()}.json`, `{
	"version": "${versionString}",
	"timestamp": "${(new Date()).toUTCString()}",
	"aborted": ${debug},
	"reload": true,
	"questionNum": ${questionNum},
	"lastRoundWinner": "${lastRoundWinner}",
	"roundWinnerScore": ${roundWinnerScore},
	"roundWinnerStreak": ${roundWinnerStreak},
	"lastBestTimePlayer": "${lastBestTimePlayer}",
	"lastBestTime": ${lastBestTime},
	"lastBestStreakPlayer": "${lastBestStreakPlayer}",
	"lastBestStreak": ${lastBestStreak},
	"players": ${JSON.stringify(players)}
	}`);

	fs.writeFileSync(outputFilename, "<!DOCTYPE html><html><head><title>Discord Trivia Bot Results</title><meta charset=\"UTF-8\"></head>\n<body>\n<h1>Winners of round</h1>\n<p");
	if (debug) {
		fs.appendFileSync(outputFilename, " style=\"color: red\">(aborted");
	} else {
		fs.appendFileSync(outputFilename, ">(ended");
	}
	fs.appendFileSync(outputFilename, ` at ${(new Date()).toUTCString()})</p>\n<table border=\"1\">\n<tr><th>Rank</th><th>Name</th><th>User ID</th><th>Score</th><th>Best Streak</th><th>Best Time</th><th>Avg. Time</th></tr>`);
	for (var i = 0; i < players.length; i++) {
		fs.appendFileSync(outputFilename, `\n<tr><td>${getOrdinal(i + 1)}</td><td>${players[i].name}</td><td>&lt;@${players[i].id}&gt;</td><td>${players[i].score}</td><td>${players[i].streak}</td><td>${(players[i].bestTime / 1000).toFixed(3)}</td><td>${(players[i].time / players[i].score / 1000).toFixed(3)}</td></tr>`);
	}
	fs.appendFileSync(outputFilename, "\n</table>\n<p>Discord Trivia Bot (v" + versionString + ") created by <a href=\"https://bulbapedia.bulbagarden.net/wiki/User:Abcboy\">abcboy</a></p>");
	if (debug) {
		fs.appendFileSync(outputFilename, `\n<h2>Error info:</h2><ul>\n<li>var reload = true;</li>\n<li>var questionNum = ${questionNum};</li>\n<li>var lastRoundWinner = "${lastRoundWinner}";</li>\n<li>var roundWinnerScore = ${roundWinnerScore};</li>\n<li>var roundWinnerStreak = ${roundWinnerStreak};</li>\n<li>var lastBestTimePlayer = "${lastBestTimePlayer}";</li>\n<li>var lastBestTime = ${lastBestTime};</li>\n<li>var lastBestStreakPlayer = "${lastBestStreakPlayer}";</li>\n<li>var lastBestStreak = ${lastBestStreak};</li>\n<li>var players = ${JSON.stringify(players)};</li>`);
	}
	fs.appendFileSync(outputFilename, "\n</body>\n</html>");
}

function downloadQuestions(callback) {
	request.get(settings.downloadUrl, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			fs.writeFileSync(settings.filepath, "\uFEFF<!-- DISCORD TRIVIA FILE -->\n" + body.replace(/^\uFEFF/, ''));
			console.log(localize("c_downloadSuccess"));
		} else {
			console.log(localize("c_downloadFailure"));
		}
		if (typeof callback === "function") {
			callback(startTrivia);
		}
	});
}

function randRange(n) {
	// return Math.floor(Math.random() * n);
	var limit = Math.pow(2, 32) - (Math.pow(2, 32) % n);
	var rand = parseInt(crypto.randomBytes(4).toString('hex'), 16);
	while (rand >= limit) {
        rand = parseInt(crypto.randomBytes(4).toString('hex'), 16);
    }
	return Math.floor(rand / Math.pow(2, 32) * n);
}

function randomizeQuestions(callback) {
	var data;
	try {
		data = fs.readFileSync(settings.filepath, "utf8");
	} catch(err) {
		console.log(localize("c_fileReadError"));
		data = "null*null";
	}
	var lines = data.replace(/\r\n/g, "\n").replace(/<!--(.|\n)*?-->/g, "").replace(/\/\*(.|\n)*?\*\//g, "").replace(/\n+/g, "\n").trim().split("\n");
	allQuestionNum = lines.length;
	// shuffles questions
	for(var i = allQuestionNum - 1; i > 0; i--) {
		var j = randRange(i + 1);
		// var j = Math.floor(Math.random() * (i + 1));
		var tmp = lines[i];
		lines[i] = lines[j];
		lines[j] = tmp;
	}
	// moves questions that have a chance of being moved to the bottom
	for(var i = 0; i < lines.length; i++) {
		if (lines[i].indexOf("{") !== -1 && lines[i].indexOf("}") !== -1) {
			var chance = Number(lines[i].match(/\{(.*)\}/)[1]);
			if (!isNaN(chance))
			{
				if (Math.random() < chance) {
					lines.push(lines.splice(i, 1)[0].replace(/\{.*\}/, ""));
					i--;
				} else {
					lines[i] = lines[i].replace(/\{.*\}/, "");
				}
			}
		}
	}
	
	if (settings.maxQuestionNum > allQuestionNum) {
		settings.maxQuestionNum = allQuestionNum;
	}
	fs.writeFileSync("shuffled.txt", lines.join("\n"));
	console.log(localize("c_scrambled"));
	
	if (typeof callback === "function") {
		callback();
	}
}

function clean(unclean) {
	unclean = unclean.toLowerCase();
	for (var i = 0; i < local.clean.length; i++) {
		unclean = unclean.replace(new RegExp(local.clean[i][0], "g"), local.clean[i][1]);
	}
	return unclean.trim();
}

function cleanTypos(unclean) {
	for (var i = 0; i < local.typos.length; i++) {
		unclean = unclean.replace(new RegExp(local.typos[i][0], "g"), local.typos[i][1]);
	}
	return unclean;
}

function parseAnswer(answer, correct) {
	// string is lowercased, trimmed, and multiple spaces removed, accented characters are normalized, & is turned to and, all non-alphanumeric characters removed
	var cleanAnswer = clean(answer);
	for (var i = 0; i < correct.length; i++) {
		// each answer choice is cleaned and compared
		if (!settings.containsAnswer && ((answer === correct[i]) || (cleanAnswer.length > 0 && ((cleanAnswer === clean(correct[i])) || (cleanTypos(cleanAnswer) === cleanTypos(clean(correct[i]))))))) {
			// exact match
			return true;
		}
		else if (settings.containsAnswer && ((correct[i].indexOf(answer) !== -1) || (cleanAnswer.length > 0 && ((clean(correct[i]).indexOf(cleanAnswer) !== -1) || (cleanTypos(clean(correct[i])).indexOf(cleanTypos(cleanAnswer))))))) {
			// contains match
			return true;
		}
	}
	return false;
}

function askQuestion() {
	clearTimeout(questionTimeout);
	clearTimeout(hintTimeout);
	clearTimeout(skipTimeout);
	clearTimeout(typeTimeout);
	triviaChannel.stopTyping();
	
	// check for a tie
	if (settings.tiebreaker && players.length > 1 && questionNum + tieQuestionNum < allQuestionNum && questionNum >= settings.maxQuestionNum && players[0].score === players[1].score) {
		if (tieQuestionNum === 0) {
			triviaChannel.send(localize("d_tiebreaker"));
		}
		tieQuestionNum++;
	}
	
	// continue unless we've reached maxQuestionNum
	if (questionNum < (settings.maxQuestionNum + tieQuestionNum) && trivia) {
		if (attempts > 0) {
			bot.login(settings.token).then(() => {
				attempts = 0;
			}).catch(err => {
				reconnect();
			});
			if (!answered) {
				triviaChannel.send(localize("d_skipConnect"));
				answered = true;
			}
		}
		
		var line = getLine(questionNum);
		questionNum++;
		var questionText = line.substring(0,line.indexOf("*")).replace(/\[.*\]/,"").replace(/\<.*\>/,"").replace(/_/g,"\\_").replace(/\\n/g,"\n").trim();
		
		if (line.indexOf("`") !== -1) { // if there's a note
			answerArray = line.substring(line.indexOf("*")+1,line.indexOf("`")).replace(/\[.*\]/,"").replace(/\<.*\>/,"").split("*");
			answerText = answerArray[0].trim() + " (" + line.substring(line.indexOf("`")+1).replace(/\[.*\]/,"").replace(/\<.*\>/,"").replace(/_/g,"\\_") + ")";
		} else {
			answerArray = line.substring(line.indexOf("*")+1).replace(/\[.*\]/,"").replace(/\<.*\>/,"").split("*");
			answerText = answerArray[0].trim();
		}
		
		if (line.indexOf("<") !== -1 && line.indexOf(">") !== -1) { // if there's an answer attachment
			answerImage = line.match(/\<(.*)\>/)[1];
			console.log(answerImage);
		} else {
			answerImage = "";
		}
		
		if (musicChannel && line.indexOf("[v|") !== -1 && line.indexOf("]") !== -1) { // if there's a music attachment
			answerMusic = line.match(/\[v\|(.*)\]/)[1];
			musicChannel.send("~play " + answerMusic);
			console.log(answerMusic);
		} else {
			answerMusic = "";
		}
		
		if (line.indexOf("[v|") === -1 && /\[(.*\..*)\]/.test(line)) { // if there's an image attachment
			filename = line.match(/\[(.*\..*)\]/)[1];
			var filetype = path.extname(filename);
			fs.readFile(filename, (err, data) => {
				if (err) {
					console.log(localize("c_attachmentFailure", "${filename}", filename));
				} else {
					triviaChannel.send(`${(questionNum - startQuestionNum).toString()}. **${questionText}**`, new Discord.MessageAttachment(data, `attachment.${filetype}`)).then(questionMessage => {
						attempts = 0;
						console.log(questionText);
						console.log(answerArray);
						questionTimestamp = questionMessage.createdTimestamp;
						console.log(questionTimestamp);
						answered = false;
					}).catch(err => {
						console.log(localize("c_attachmentFailure", "${filename}", filename));
						triviaChannel.send(`${(questionNum - startQuestionNum).toString()}. **${questionText}**`).then(questionMessage => {
							attempts = 0;
							console.log(questionText);
							console.log(answerArray);
							questionTimestamp = questionMessage.createdTimestamp;
							console.log(questionTimestamp);
							answered = false;
						}).catch(err => {
							questionNum--;
							reconnect();
						});
					});
				}
			});
			hintTimeout = setTimeout(hint, settings.hintTime);
			skipTimeout = setTimeout(skipQuestion, settings.skipTime + 350);
		} else { // if there's no attachment
			triviaChannel.send(`${(questionNum - startQuestionNum).toString()}. **${questionText}**`).then(questionMessage => {
				attempts = 0;
				console.log(questionText);
				console.log(answerArray);
				questionTimestamp = questionMessage.createdTimestamp;
				console.log(questionTimestamp);
				answered = false;
			}).catch(err => {
				questionNum--;
				reconnect();
			});
			if (answerMusic === "") {
				hintTimeout = setTimeout(hint, settings.hintTime);
				skipTimeout = setTimeout(skipQuestion, settings.skipTime + 350);
			} else { // add 15 seconds for music question
				hintTimeout = setTimeout(hint, settings.hintTime + 15000);
				skipTimeout = setTimeout(skipQuestion, settings.skipTime + 15000 + 350);
			}
		}
	}
	else {
		endTrivia(true);
	}
}

function hint() {
	clearTimeout(questionTimeout);
	clearTimeout(hintTimeout);
	clearTimeout(typeTimeout);
	var hintType = Math.floor(Math.random() * 3); // 3 types of hint (0, 1, 2)
	var roundHint;
	if (answerArray[0].length < 3) { // if 2 letters or shorter, length hint
		roundHint = answerArray[0].length;
		triviaChannel.send(`**${localize("d_hintNotice")}** (${localize("d_hintTypeLen")}): ${roundHint}`);
	} else if (answerArray[0].length < 5) { // if 4 letters or shorter, last letters hint
		roundHint = answerArray[0].slice(-1);
		triviaChannel.send(`**${localize("d_hintNotice")}** (${localize("d_hintTypeLst")}): ${roundHint}`);
	} else if (hintType === 0) { //scramble the hint
		roundHint = hintScramble();
		triviaChannel.send(`**${localize("d_hintNotice")}** (${localize("d_hintTypeScr")}): ${roundHint}`);
	} else if (hintType === 1) { //replace 60% with blanks
		roundHint = hintBlanks();
		triviaChannel.send(`**${localize("d_hintNotice")}** (${localize("d_hintTypeBln")}): ${roundHint}`);
	} else if (hintType === 2) { // fill in the non-vowels
		roundHint = answerArray[0].replace(/[b-df-hj-np-tv-zB-DF-HJ-NP-TV-Z0-9ßçðñýÿẞÇÐÑÝŸ]/g,"\\_");
		if (roundHint === answerArray[0] || roundHint === roundHint.replace(/[aeiouAEIOUàáâãäåæèéêëìíîïòóôõöùúûüÀÁÂÃÄÅÆÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]/g,"\\_")) { //if hint has no vowels or is all vowels
			if (Math.random() < 0.5) { // fill in the blanks
				roundHint = hintBlanks();
				triviaChannel.send(`**${localize("d_hintNotice")}** (${localize("d_hintTypeBln")}): ${roundHint}`);
			} else { // scrambled hint
				roundHint = hintScramble();
				triviaChannel.send(`**${localize("d_hintNotice")}** (${localize("d_hintTypeScr")}): ${roundHint}`);
			}
		} else {
			triviaChannel.send(`**${localize("d_hintNotice")}** (${localize("d_hintTypeVow")}): ${roundHint}`);
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
		if (i === 0 || ((i !== s.length - 1) && (Math.random() < 0.40) && ((code > 47 && code < 58) || (code > 64 && code < 91) || (code > 96 && code < 123) || (local.special.indexOf(s[i]) !== -1)))) { // if part of the 60% and alphanumeric or special
			blanks += "\\_";
		}
		else {
			blanks += s[i];
		}
	}
	return blanks;
}

function skipQuestion() {
	clearTimeout(questionTimeout);
	clearTimeout(hintTimeout);
	clearTimeout(skipTimeout);
	clearTimeout(typeTimeout);
	triviaChannel.stopTyping();
	if (answerImage !== "") { // answer attachments
		fs.readFile(answerImage, (err, data) => {
			if (err) {
				console.log(localize("c_attachmentFailure", "${filename}", answerImage));
			} else {
				triviaChannel.send(localize("d_skip"), new Discord.MessageAttachment(data, path.basename(answerImage))).catch(err => {
					console.log(localize("c_attachmentFailure", "${filename}", answerImage));
					triviaChannel.send(localize("d_skip")).catch(err => {
						reconnect();
					});
				});
			}
		});
	} else {
		triviaChannel.send(localize("d_skip")).catch(err => {
			reconnect();
		});
	}
	
	if (answerMusic !== "") { // music
		musicChannel.send("~clear").then(message => {
			musicChannel.send("~skip").then(message => {
				musicChannel.send("~skip");
			})
		}).catch(err => {
			console.log(localize("c_musicFailure", "${answerMusic}", answerMusic));
		});
	}
	if (roundWinnerStreak > 5) {
		triviaChannel.send(localize("d_skipEndStreak"));
	}
	lastRoundWinner = "null";
	roundWinnerStreak = -1;
	answered = true;
	questionTimeout = setTimeout(askQuestion, settings.betweenTime);
	typeTimeout = setTimeout(function(){
		if (trivia) {
			triviaChannel.startTyping();
		}
	}, Math.max(settings.betweenTime - 5000, 0));
}

function checkSchedule() {
	clearTimeout(scheduleTimeout);
	if (settings.schedule.length === 0) {
		return;
	} else {
		settings.schedule = settings.schedule.sort(function(a, b) {
			return a - b;
		});
		while (settings.schedule.length > 0 && settings.schedule[0] < Date.now() - 60000) {
			var oldSchedule = settings.schedule.shift();
		}
		if (settings.schedule.length > 0) {
			when = settings.schedule[0];
		} else {
			when = -1;
		}
		
		if (settings.schedule[0] < Date.now() + 600000) {
			clearTimeout(triviaTimeout);
			triviaTimeout = setTimeout(function() {
				if (settings.schedule[0] < Date.now()) {
					var oldSchedule = settings.schedule.shift();
					if (settings.schedule.length > 0) {
						when = settings.schedule[0];
					} else {
						when = -1;
					}
				}
		
				if (!trivia && !paused && settings.autoDownload) {
					trivia = true;
					downloadQuestions(randomizeQuestions);
				} else if (!trivia && !paused) {
					trivia = true;
					randomizeQuestions(startTrivia)
				}
			}, Math.max(1, settings.schedule[0] - Date.now()));
		} else if (settings.schedule.length > 0) {
			scheduleTimeout = setTimeout(checkSchedule, 600000);
		}
	}
}

function getOrdinal(n) {
	return local.ordinals[n % local.ordinals.length].replace("$", n);
}

function reconnect() {
	if (trivia) {
		if (attempts === 0) {
			clearTimeout(questionTimeout);
			clearTimeout(hintTimeout);
			clearTimeout(skipTimeout);
			clearTimeout(typeTimeout);
			outputScores(true);
			console.log(localize("c_reconnect"));
			questionTimeout = setTimeout(askQuestion, 10000);
			console.log(localize("c_reconnectAttempt"));
		} else {
			questionTimeout = setTimeout(askQuestion, 10000);
			console.log(localize("c_reconnectReattempt"));
		}
		attempts++;
	}
}

bot.on("error", (error) => {
	if (attempts === 0 && trivia) {
		console.log(error);
		reconnect();
	}
});

bot.on("disconnect", (error) => {
	/*if (attempts === 0) {
		console.log(error);
		reconnect();
	}*/
});

bot.on("message", (message) => {
    var deleteAfter = false;
	// sets trivia channel
	var privileged;
	if (triviaChannel != null) {
		if (triviaChannel.permissionsFor(message.author) == null) {
			privileged = false;
		} else {
			privileged = (triviaChannel.permissionsFor(message.author).has("BAN_MEMBERS") || message.author.id === bot.user.id);
		}
	} else if (settings.allowedChannels.includes(message.channel.name)) {
		if (!settings.triviaChannel || settings.triviaChannel === message.channel.id) {
			triviaChannel = message.channel;
		}
		privileged = (triviaChannel.permissionsFor(message.author).has("BAN_MEMBERS") || message.author.id === bot.user.id);
	}
	
	if (message.channel.isPrivate && message.author.id !== bot.user.id) {
		console.log("**" + localize("c_incomingDM", "${message.author.username}", message.author.username, "${message.cleanContent}", message.cleanContent)+ "**");
	}
	
	// if anyone says "!info" in the chat or DM it, they get a DM with their current score and place
	if (message.content === "!info") {
		var authorIndex;
		for (var i = 0; i < players.length; i++) {
			if (players[i].id === message.author.id) {
				authorIndex = i;
				break;
			}
		}
		if (typeof players[authorIndex] === "undefined") { // if the user hasn't played
			var score = "0";
			var streak = 0;
			var place = "—";
			var bestTime = "—";
			var avgTime = "—";
		} else {
			var score = players[authorIndex].score;
			var streak = players[authorIndex].streak;
			var place = getOrdinal(authorIndex + 1);
			var bestTime = (players[authorIndex].bestTime / 1000).toFixed(3);
			var time = players[authorIndex].time;
			var avgTime = (time / score / 1000).toFixed(3);
		}
		message.author.send(`${localize("d_info")}:\n**${localize("t_points")}**: ${score} **${localize("t_place")}**: ${place} **${localize("t_bestStreak")}**: ${streak} **${localize("t_bestTime")}**: ${bestTime} ${localize("t_sec")} **${localize("t_avgTime")}**: ${avgTime} ${localize("t_sec")}`);
		deleteAfter = true;
	}

	// if anyone says "!top" in the chat or DM it, they get a DM with the top ten
	else if (message.content === "!top" || message.content === "!records") {
		message.author.send(topTen);
		deleteAfter = true;
	}

	// if anyone says "!help" in the chat or DM it, they get a DM with valid commands
	else if (message.content === "!help") {
		if (triviaChannel == null || privileged) {
			message.author.send(localize("d_helpA"));
		} else if (settings.anyoneStop) {
			message.author.send(localize("d_helpB"));
		} else if (settings.anyoneStart) {
			message.author.send(localize("d_helpC"));
		} else {
			message.author.send(localize("d_helpD"));
		}
		deleteAfter = true;
	}
	
	// if a privileged user says "!exit" in the chat or DM it, the bot will be terminated
	else if (privileged && message.content === "!exit") {
		deleteMessage(message);
		exitHandler();
	}
	
	// if a privileged user says "!echo" in the chat or DM it, the bot will repeat it
	else if (privileged && message.content.split(" ")[0] === "!echo") {
		if (triviaChannel != null) {
			triviaChannel.send(message.content.substring(6));
		} else {
			message.channel.send(message.content.substring(6));
		}
		console.log(message.content.substring(6));
		deleteAfter = true;
	}
	
	// if a user says "!when" in the chat or DM it, the bot will DM the next scheduled trivia
	else if (message.content === "!when") {
		if (when > 0) {
			message.author.send("*" + localize("d_schedule", "${time}", new Date(when).toUTCString()) + "*");
		} else if (settings.schedule.length > 0) {
			message.author.send("*" + localize("d_schedule", "${time}", new Date(settings.schedule[0]).toUTCString()) + "*");
		} else {
			message.author.send("*" + localize("d_noSchedule") + "*");
		}
		deleteAfter = true;
	}
	
	// if a privileged user says "!results" in the chat or DM it, the bot will DM the last results
	else if (privileged && message.content === "!results") {
		if (resultsFilename === "") {
			fs.readdir(__dirname, "utf8", function(err, files){
				if (err || files.length === 0) {
					message.author.send("*" + localize("d_noResults") + "*");
				} else {
					files.sort();
					files.forEach(function (item, index, array) {
						if (item.substring(0, 7) === "results") {
							resultsFilename = item;
						}	
					});
					if (resultsFilename === "") {
						message.author.send("*" + localize("d_noResults") + "*");
					} else {
						message.author.send("", new Discord.MessageAttachment(resultsFilename)).catch(err => {
							console.log(localize("c_attachmentFailure", "${filename}", resultsFilename));
						});
					}
				}
			});
		} else {
			message.author.send("", new Discord.MessageAttachment(resultsFilename)).catch(err => {
				console.log(localize("c_attachmentFailure", "${filename}", resultsFilename));
			});
		}
		deleteAfter = true;
	}
	
	// only executes if in chat channel trivia or test
	else if (settings.allowedChannels.includes(message.channel.name) || settings.triviaChannel === message.channel.id) {
		// only if Rapidash Trivia or people who can manage server types, or if settings.anyoneStart is true
		if (settings.anyoneStart || settings.anyoneStop || privileged) {
			if (!trivia && !paused && message.content === "!start"){ // starts the trivia
				if (!settings.triviaChannel || settings.triviaChannel == message.channel.id) {
					triviaChannel = message.channel;
				}
		        deleteAfter = true;
				if (settings.autoDownload) {
					downloadQuestions(randomizeQuestions);
				} else {
					randomizeQuestions(startTrivia)
				}
			} else if (!trivia && !paused && message.content.split(" ")[0] === "!list"){ // changes trivia list
				deleteAfter = true;
				var filepath = message.content.substr(6).trim();
				if (filepath.slice(-4).toLowerCase() !== ".txt") {
					filepath = filepath + ".txt"
				}
				try {
					if (fs.readFileSync(filepath, "utf8").replace(/^\uFEFF/, '').substring(0,28) === "<!-- DISCORD TRIVIA FILE -->") {
					settings.filepath = filepath;
					console.log(localize("c_list"));
					} else {
						console.log(localize("c_fileReadError"));
					}
				}
				catch(err) {
					console.log(localize("c_fileReadError"));
				}
			}
		}

		// only if Rapidash Trivia or people who can manage server types, or if settings.anyoneStop is true
		if (settings.anyoneStop || privileged) {
			if (trivia && message.content === "!stop"){ // stops the trivia
				deleteAfter = true;
				endTrivia(false);
			} else if (trivia && message.content === "!pause"){ // pauses the trivia
				deleteAfter = true;
				trivia = false;
				paused = true;
				clearTimeout(hintTimeout);
				clearTimeout(skipTimeout);
				clearTimeout(questionTimeout);
				clearTimeout(typeTimeout);
				if (!answered) {
					questionNum--;
				}
				answered = true;
				triviaChannel.stopTyping();
				message.channel.send(`*${localize("d_pause")}*`);
				console.log(localize("d_pause"));
			} else if (!trivia && paused && message.content === "!continue"){ // continues the trivia
				deleteAfter = true;
				trivia = true;
				paused = false;
				triviaChannel.startTyping();
				questionTimeout = setTimeout(askQuestion, 1000);
				message.channel.send(`*${localize("d_continue")}*`);
				console.log(localize("d_continue"));
			} else if (!answered && message.content === "!hint"){ // gives the hint now
				deleteAfter = true;
				clearTimeout(hintTimeout);
				hint(message);
			} else if (!answered && message.content === "!skip"){ // skips the question
				deleteAfter = true;
				clearTimeout(hintTimeout);
				clearTimeout(skipTimeout);
				skipQuestion(message);
			} else if (message.content === "!anyone start"){ // anyone can start the trivia
				deleteAfter = true;
				settings.anyoneStart = !settings.anyoneStart;
				if (settings.anyoneStart) {
					settings.anyoneStop = false;
					message.channel.send(`*${localize("d_anyoneStartOn")}*`);
					console.log(localize("d_anyoneStartOn"));
				} else {
					settings.anyoneStop = false;
					message.channel.send(`*${localize("d_anyoneStartOff")}*`);
					console.log(localize("d_anyoneStartOff"));
				}
			} else if (message.content === "!anyone stop"){ // anyone can stop the trivia
				deleteAfter = true;
				settings.anyoneStop = !settings.anyoneStop;
				settings.anyoneStart = settings.anyoneStop;
				if (settings.anyoneStop) {
					message.channel.send(`*${localize("d_anyoneStopOn")}*`);
					console.log(localize("d_anyoneStopOn"));
				} else {
					message.channel.send(`*${localize("d_anyoneStopOff")}*`);
					console.log(localize("d_anyoneStopOff"));
				}
			} else if (message.content === "!anyone answer"){ // staff can answer the trivia
				deleteAfter = true;
				settings.anyoneAnswer = !settings.anyoneAnswer;
				if (settings.anyoneAnswer) {
					message.channel.send(`*${localize("d_anyoneAnswerOn")}*`);
					console.log(localize("d_anyoneAnswerOn"));
				} else {
					message.channel.send(`*${localize("d_anyoneAnswerOff")}*`);
					console.log(localize("d_anyoneAnswerOff"));
				}
			} else if (!trivia && !paused && message.content.split(" ")[0] === "!questions"){ // changes number of questions
				deleteAfter = true;
				var newQuestions = Math.max(1, parseInt(message.content.substr(11).trim(), 10));
				if (isNaN(newQuestions)) {
					newQuestions = settings.maxQuestionNum;
				}
				settings.maxQuestionNum = newQuestions;
				console.log(localize("c_questions"));
			} else if (!trivia && !paused && message.content === "!download"){
				deleteAfter = true;
				downloadQuestions();
			} else if (!trivia && !paused && message.content === "!settings"){
				deleteAfter = true;
				try {
					settings = JSON.parse(`{${fs.readFileSync("settings.txt", "utf8").replace(/^\uFEFF/, '')}}`);
					console.log(localize("c_settingsLoaded"));
					try {
						local = JSON.parse(`{${fs.readFileSync("local_" + settings.lang + ".txt", "utf8").replace(/^\uFEFF/, '')}}`);
						console.log(localize("c_langLoaded"));
					} catch(err) {
						console.log(localize("c_langFailed"));
					}
					if (settings.triviaChannel) {
						bot.channels.fetch(settings.triviaChannel).then((channel) => {
							triviaChannel = channel;
						});
					}
					if (settings.musicChannel) {
						bot.channels.fetch(settings.musicChannel).then((channel) => {
							musicChannel = channel;
						});
					}
				} catch(err) {
					console.log(localize("c_settingsFailed"));
				}
			} else if (!trivia && !paused && message.content.split(" ")[0] === "!settings"){
				deleteAfter = true;
				resultsFilename = message.content.substr(10).trim();
				if (resultsFilename.slice(-4).toLowerCase() !== ".txt") {
					resultsFilename = resultsFilename + ".txt"
				}
				try {
					var data = fs.readFileSync(resultsFilename, "utf8");
					settings = JSON.parse(`{${data.replace(/^\uFEFF/, '')}}`);
					fs.writeFileSync("settings.txt", data);
					console.log(localize("c_settingsLoaded"));
					try {
						local = JSON.parse(`{${fs.readFileSync("local_" + settings.lang + ".txt", "utf8").replace(/^\uFEFF/, '')}}`);
						console.log(localize("c_langLoaded"));
					} catch(err) {
						console.log(localize("c_langFailed"));
					}
					if (settings.triviaChannel) {
						bot.channels.fetch(settings.triviaChannel).then((channel) => {
							triviaChannel = channel;
						});
					}
					if (settings.musicChannel) {
						bot.channels.fetch(settings.musicChannel).then((channel) => {
							musicChannel = channel;
						});
					}
				} catch(err) {
					console.log(localize("c_fileReadError"));
				}
				
			} else if (message.content === "!reload") {
				deleteAfter = true;
				reload = !reload;
				if (reload) {
					console.log(localize("c_reloadOff"));
				} else {
					console.log(localize("c_reloadOn"));
				}
			} else if (message.content.split(" ")[0] === "!disallow") {
				deleteAfter = true;
				triviaChannel.updateOverwrite(message.mentions.users.first(), {
					SEND_MESSAGES: false
				});
			} else if (message.content.split(" ")[0] === "!allow") {
				deleteAfter = true;
				triviaChannel.updateOverwrite(message.mentions.users.first(), {
					SEND_MESSAGES: null
				});
			} else if (!trivia && message.content.split(" ")[0] === "!timer") {
				if (!settings.triviaChannel || settings.triviaChannel == message.channel.id) {
					triviaChannel = message.channel;
				}
				deleteAfter = true;
				var time = Math.max(1, message.content.substr(7).trim()) * 1000;
				if (!isNaN(time)) {
					settings.schedule.push(Date.now() + time);
					checkSchedule();
					console.log(localize("d_timer", "${time}", time / 1000));
					triviaChannel.send("*" + localize("d_timer", "${time}", time / 1000) + "*");
				}
			} else if (!trivia && message.content.split(" ")[0] === "!schedule") {
				if (!settings.triviaChannel || settings.triviaChannel == message.channel.id) {
					triviaChannel = message.channel;
				}
				deleteAfter = true;
				var time = Math.max(Date.now() + 1000, message.content.substr(10).trim() * 1000);
				if (!isNaN(time)) {
					settings.schedule.push(time);
					checkSchedule();
					console.log(localize("d_schedule", "${time}", new Date(time).toUTCString()));
					triviaChannel.send("*" + localize("d_schedule", "${time}", new Date(time).toUTCString()) + "*");
				}
			} else if (message.content === "!emoji") {
				deleteAfter = true;
				var allEmoji = "Emoji: " + fs.readFileSync("local_" + settings.lang + ".txt", "utf8").replace(/^\uFEFF/, '').match(/<:.*?:\d*?>/g).join();
				console.log(allEmoji);
				triviaChannel.send(allEmoji);
			} else if (!answered && !settings.anyoneAnswer && privileged && parseAnswer(message.content, answerArray)) {
				deleteAfter = true;
			}
		}

		// if answer is correct
		if (!answered && (settings.anyoneAnswer || !privileged) && parseAnswer(message.content, answerArray)) {
			var timeTaken = message.createdTimestamp - questionTimestamp;
			var winnerIndex = -1;
			for (var i = 0; i < players.length; i++) {
				if (players[i].id === message.author.id) {
					winnerIndex = i;
					break;
				}
			}
			if (winnerIndex !== -1 && (timeTaken < 1000 || timeTaken > (settings.skipTime + 163500) || 12000 * message.content.length / timeTaken > 120)) { //if they answer in less than 1500 ms, before the question is sent to the server, or WPM is greater than 120
				players[winnerIndex].strikes++;
				if (players[winnerIndex].strikes === 3) {
					console.log(localize("c_ban", "${message.author.username}", message.author.username, "${message.author.toString()}", message.author.toString(), "timeTaken", timeTaken, "message.content.length", message.content.length));
					message.channel.guild.ban(message.author, 0);
					message.channel.send(localize("d_ban", "${message.author.toString()}", message.author.toString()));
					message.author.send(localize("d_banDm"));
				} else {
					console.log(localize("c_strike", "${message.author.username}", message.author.username, "${message.author.toString()}", message.author.toString(), "timeTaken", timeTaken, "message.content.length", message.content.length));
				}
				deleteAfter = true;
			} else {
				clearTimeout(hintTimeout);
				clearTimeout(skipTimeout);
				var oldRank;
				if (winnerIndex === -1) { // if player hasn't won before
					players.push({
						id: message.author.id,
						name: message.author.username,
						score: 1,
						streak: 1,
						time: timeTaken,
						bestTime: timeTaken,
						strikes: 0});
					oldRank = players.length + 1; // rank + 1 to force message
					roundWinnerScore = 1;
					winnerIndex = players.length - 1;
				} else { // if player has won before
					players[winnerIndex].name = message.author.username;
					players[winnerIndex].score++;
					players[winnerIndex].time += timeTaken;
					oldRank = winnerIndex + 1;
					roundWinnerScore = players[winnerIndex].score;

					if (timeTaken < players[winnerIndex].bestTime) { // if this is a better time than old best time
						players[winnerIndex].bestTime = timeTaken;
					}
					
					players = players.map(function(a, b) {
						return {player: a, pos: b};
					}).sort(function(a, b) {
						if (b.player.score - a.player.score === 0) {
							return a.pos - b.pos;
						} else {
							return b.player.score - a.player.score;
						}
					}).map(function(a) {
						return a.player;
					});
				}
				
				// calculate player rank
				var rank;
				for (var i = 0; i < players.length; i++) {
					if (players[i].id === message.author.id) {
						rank = i + 1;
						break;
					}
				}
				
				// keep track of current streak
				if (lastRoundWinner === message.author.id) {
					roundWinnerStreak++;
					if (roundWinnerStreak > players[winnerIndex].streak) {
						players[winnerIndex].streak = roundWinnerStreak;
					}
					if (roundWinnerStreak > 5) {
						message.channel.send(localize("d_streakContinue", "${message.author.toString()}", message.author.toString()));
					}
				} else {
					if (roundWinnerStreak > 5) {
						message.channel.send(localize("d_streakBroken", "${message.author.toString()}", message.author.toString()));
					}
					roundWinnerStreak = 1;
				}
				
				// sends message if they moved up in rank
				if (rank < oldRank && oldRank === players.length + 1) {
					message.channel.send(localize("d_rankUp", "${getOrdinal(rank)}", getOrdinal(rank), "${message.author.toString()}", message.author.toString(), "${rank}", rank, "${getOrdinal(oldRank)}", "—"));
				} else if (rank < oldRank) {
					message.channel.send(localize("d_rankUp", "${getOrdinal(rank)}", getOrdinal(rank), "${message.author.toString()}", message.author.toString(), "${rank}", rank, "${getOrdinal(oldRank)}", getOrdinal(oldRank)));
				}
				
				// keep track of time record for current round
				if (lastBestTimePlayer === "null") { // if there is no best time yet
					lastBestTimePlayer = message.author.id;
					lastBestTime = timeTaken;
				} else if (timeTaken < lastBestTime) { // if the player beat the last best time
					message.channel.send(localize("d_timeNewRecord", "timeTaken", timeTaken, "${message.author.toString()}", message.author.toString()));
					lastBestTimePlayer = message.author.id;
					lastBestTime = timeTaken;
				}

				// keep track of streak record for current round
				if (lastBestStreakPlayer === "null") { // if there is no best streak yet
					lastBestStreakPlayer = message.author.id;
					lastBestStreak = roundWinnerStreak;
				} else if (roundWinnerStreak > lastBestStreak) { // if the player beat the last best streak
					if (lastBestStreakPlayer !== message.author.id) {
						message.channel.send(localize("d_streakNewRecord", "${message.author.toString()}", message.author.toString()));
					}
					lastBestStreakPlayer = message.author.id;
					lastBestStreak = roundWinnerStreak;
				}

				// sends message based on streak
				for (var i = 0; i < local.streakMsg.length; i++) {
					if (local.streakMsg[i][0] === roundWinnerStreak) {
						message.channel.send(local.streakMsg[i][1].replace(new RegExp("\\$\\{bot\\.user\\.toString\\(\\)\\}", "g"), bot.user.toString()).replace(new RegExp("\\$\\{message\\.author\\.toString\\(\\)\\}", "g"), message.author.toString()));
						break;
					}
				}

				// sends message based on points
				for (var i = 0; i < local.scoreMsg.length; i++) {
					if (local.scoreMsg[i][0] === roundWinnerScore) {
						message.channel.send(local.scoreMsg[i][1].replace(new RegExp("\\$\\{bot\\.user\\.toString\\(\\)\\}", "g"), bot.user.toString()).replace(new RegExp("\\$\\{message\\.author\\.toString\\(\\)\\}", "g"), message.author.toString()));
						break;
					}
				}

				// say correct answer and who entered it
				var winMessage = `**${localize("t_roundWinner")}**: ${message.author.toString()} **${localize("t_answer")}**: ${answerText} **${localize("t_points")}**: ${roundWinnerScore} **${localize("t_place")}**: ${getOrdinal(rank)} **${localize("t_streak")}**: ${roundWinnerStreak} **${localize("t_time")}**: ${(timeTaken / 1000).toFixed(3)} ${localize("t_sec")}`;
				if (answerImage !== "") { // answer attachments
					fs.readFile(answerImage, (err, data) => {
						if (err) {
							console.log(localize("c_attachmentFailure", "${filename}", answerImage));
						} else {
							message.channel.send(winMessage, new Discord.MessageAttachment(data, path.basename(answerImage))).catch(err => {
								console.log(localize("c_attachmentFailure", "${filename}", answerImage));
								message.channel.send(winMessage);
							});
						}
					});
				} else {
					message.channel.send(winMessage);
				}
				console.log(`${localize("t_roundWinner")}: ${message.author.username} ${message.author.toString()} ${localize("t_answer")}: ${message.content} ${localize("t_points")}: ${roundWinnerScore} ${localize("t_place")}: ${getOrdinal(rank)} ${localize("t_streak")}: ${roundWinnerStreak} ${localize("t_time")}: ${(timeTaken / 1000).toFixed(3)} ${localize("t_sec")}`);
				
				// stop music
				if (answerMusic !== "") {
					try {
						musicChannel.send("~clear").then(message => {
							musicChannel.send("~skip").then(message => {
								musicChannel.send("~skip");
						})});
					}
					catch (err) {
						console.log(localize("c_musicFailure", "${answerMusic}", answerMusic));
					}
				}
			
				// update top ten information
				var place = 0;
				topTen = localize("t_topTen") + ":";
				if (players.length === 0) {
					topTen = localize("d_topTenDefault");
				}
				while ((place < 10) && (place < players.length)) {
					topTen = `${topTen}\n**${getOrdinal(place + 1)} ${localize("t_place")}**: ${players[place].name} <@${players[place].id}> **${localize("t_points")}**: ${players[place].score} **${localize("t_bestStreak")}**: ${players[place].streak} **${localize("t_bestTime")}**: ${(players[place].bestTime / 1000).toFixed(3)} ${localize("t_sec")} **${localize("t_avgTime")}**: ${(players[place].time / players[place].score / 1000).toFixed(3)} ${localize("t_sec")}`;
					place++;
				}
				
				lastRoundWinner = message.author.id;
				answered = true;
				questionTimeout = setTimeout(askQuestion, settings.betweenTime);
				typeTimeout = setTimeout(function(){
					if (trivia) {
						triviaChannel.startTyping();
					}
				}, Math.max(settings.betweenTime - 5000, 0))
			}
		}
	}

    if (deleteAfter === true) {
        deleteMessage(message);
    }
});

rl.on("line", (line) => {
	if (line === "!info" || line == "!results") {
		console.log(localize("c_commandInvalid"));
	}

	else if (line === "!top" || line === "!records") {
		console.log(topTen);
	}

	else if (line === "!help") {
		console.log(localize("d_helpA"));
	}

	else if (line === "!exit") {
		exitHandler();
	}

	else if (line.split(" ")[0] === "!echo") {
		if (triviaChannel != null) {
			triviaChannel.send(line.substring(6));
		}
	}

	else if (line === "!when") {
		if (when > 0) {
			console.log(localize("d_schedule", "${time}", new Date(when).toUTCString()));
		} else if (settings.schedule.length > 0) {
			console.log(localize("d_schedule", "${time}", new Date(settings.schedule[0]).toUTCString()));
		} else {
			console.log(localize("d_noSchedule"));
		}
	}
	
	else if (!trivia && !paused && line === "!start") {
		if (triviaChannel != null) {
			if (settings.autoDownload) {
				downloadQuestions(randomizeQuestions);
			} else {
				randomizeQuestions(startTrivia);
			}
		} else {
			console.log(localize("c_channelNotFound"));
		}
	}

	else if (!trivia && !paused && line.split(" ")[0] === "!list") {
		var filepath = line.substr(6).trim();
		if (filepath.slice(-4).toLowerCase() !== ".txt") {
			filepath = filepath + ".txt"
		}
		try {
			if (fs.readFileSync(filepath, "utf8").replace(/^\uFEFF/, '').substring(0,28) === "<!-- DISCORD TRIVIA FILE -->") {
			settings.filepath = filepath;
			console.log(localize("c_list"));
			} else {
				console.log(localize("c_fileReadError"));
			}
		}
		catch(err) {
			console.log(localize("c_fileReadError"));
		}
	}
	
	else if (trivia && line === "!stop") {
		endTrivia(false);
	}

	else if (trivia && line === "!pause") {
		trivia = false;
		paused = true;
		clearTimeout(hintTimeout);
		clearTimeout(skipTimeout);
		clearTimeout(questionTimeout);
		clearTimeout(typeTimeout);
		if (!answered) {
			questionNum--;
		}
		answered = true;
		triviaChannel.stopTyping();
		triviaChannel.send(`*${localize("d_pause")}*`);
		console.log(localize("d_pause"));
	}

	else if (!trivia && paused && line === "!continue") { // continues the trivia
		trivia = true;
		paused = false;
		questionTimeout = setTimeout(askQuestion, 1000);
		triviaChannel.send(`*${localize("d_continue")}*`);
		console.log(localize("d_continue"));
	}

	else if (!answered && line === "!hint") { // gives the hint now
		clearTimeout(hintTimeout);
		hint();
	}

	else if (!answered && line === "!skip") { // skips the question
		clearTimeout(hintTimeout);
		clearTimeout(skipTimeout);
		skipQuestion();
	}

	else if (line === "!anyone start") { // anyone can start the trivia
		settings.anyoneStart = !settings.anyoneStart;
		if (settings.anyoneStart) {
			settings.anyoneStop = false;
			triviaChannel.send(`*${localize("d_anyoneStartOn")}*`);
			console.log(localize("d_anyoneStartOn"));
		} else {
			settings.anyoneStop = false;
			triviaChannel.send(`*${localize("d_anyoneStartOff")}*`);
			console.log(localize("d_anyoneStartOff"));
		}
	}

	else if (line === "!anyone stop") { // anyone can stop the trivia
		settings.anyoneStop = !settings.anyoneStop;
		settings.anyoneStart = settings.anyoneStop;
		if (settings.anyoneStop) {
			triviaChannel.send(`*${localize("d_anyoneStopOn")}*`);
			console.log(localize("d_anyoneStopOn"));
		} else {
			triviaChannel.send(`*${localize("d_anyoneStopOff")}*`);
			console.log(localize("d_anyoneStopOff"));
		}
	}

	else if (line === "!anyone answer") { // anyone can start the trivia
		settings.anyoneAnswer = !settings.anyoneAnswer;
		if (settings.anyoneAnswer) {
			triviaChannel.send(`*${localize("d_anyoneAnswerOn")}*`);
			console.log(localize("d_anyoneAnswerOn"));
		} else {
			triviaChannel.send(`*${localize("d_anyoneAnswerOff")}*`);
			console.log(localize("d_anyoneAnswerOff"));
		}
	}

	else if (!trivia && !paused && line.split(" ")[0] === "!questions") { // changes number of questions
		var newQuestions = Math.max(1, parseInt(line.substr(11).trim(), 10));
		if (isNaN(newQuestions)) {
			newQuestions = settings.maxQuestionNum;
		}
		settings.maxQuestionNum = newQuestions;
		console.log(localize("c_questions"));
	}

	else if (!trivia && !paused && line === "!download") {
		downloadQuestions();
	}
	
	else if (!trivia && !paused && line === "!settings"){
		try {
			settings = JSON.parse(`{${fs.readFileSync("settings.txt", "utf8").replace(/^\uFEFF/, '')}}`);
			console.log(localize("c_settingsLoaded"));
			try {
				local = JSON.parse(`{${fs.readFileSync("local_" + settings.lang + ".txt", "utf8").replace(/^\uFEFF/, '')}}`);
				console.log(localize("c_langLoaded"));
			} catch(err) {
				console.log(localize("c_langFailed"));
			}
			if (settings.triviaChannel) {
				bot.channels.fetch(settings.triviaChannel).then((channel) => {
					triviaChannel = channel;
				});
			}
			if (settings.musicChannel) {
				bot.channels.fetch(settings.musicChannel).then((channel) => {
					musicChannel = channel;
				});
			}
		} catch(err) {
			console.log(localize("c_settingsFailed"));
		}
	}

	
	else if (!trivia && !paused && line.split(" ")[0] === "!settings"){
		filename = line.substr(10).trim();
		if (filename.slice(-4).toLowerCase() !== ".txt") {
			filename = filename + ".txt"
		}
		try {
			var data = fs.readFileSync(filename, "utf8");
			fs.writeFileSync("settings.txt", data);
			console.log(localize("c_settingsLoaded"));
			settings = JSON.parse(`{${data.replace(/^\uFEFF/, '')}}`);
			try {
				local = JSON.parse(`{${fs.readFileSync("local_" + settings.lang + ".txt", "utf8").replace(/^\uFEFF/, '')}}`);
				console.log(localize("c_langLoaded"));
			} catch(err) {
				console.log(localize("c_langFailed"));
			}
			if (settings.triviaChannel) {
				bot.channels.fetch(settings.triviaChannel).then((channel) => {
					triviaChannel = channel;
				});
			}
			if (settings.musicChannel) {
				bot.channels.fetch(settings.musicChannel).then((channel) => {
					musicChannel = channel;
				});
			}
		} catch(err) {
			console.log(localize("c_fileReadError"));
		}
	}
	
	else if (!trivia && line.split(" ")[0] === "!reload") {
		reload = !reload;
		if (reload) {
			console.log(localize("c_reloadOff"));
		} else {
			console.log(localize("c_reloadOn"));
		}
	}
	
	else if (line.split(" ")[0] === "!disallow") {
		bot.users.fetch(line.substr(10).trim()).then((user) => {
			triviaChannel.updateOverwrite(user, {
				SEND_MESSAGES: false
			});
		});
	}
	
	else if (line.split(" ")[0] === "!allow") {
		bot.users.fetch(line.substr(7).trim()).then((user) => {
			triviaChannel.updateOverwrite(user, {
				SEND_MESSAGES: null
			});
		});
	}
	
	else if (!trivia && line.split(" ")[0] === "!timer") {
		if (triviaChannel == null) {
			console.log(localize("c_channelNotFound"));
		} else {
			var time = Math.max(1, line.substr(7).trim()) * 1000;
			if (!isNaN(time)) {
				settings.schedule.push(Date.now() + time);
				checkSchedule();
				console.log(localize("d_timer", "${time}", time / 1000));
				triviaChannel.send("*" + localize("d_timer", "${time}", time / 1000) + "*");
			}
		}
	}
	
	else if (!trivia && line.split(" ")[0] === "!schedule") {
		if (triviaChannel == null) {
			console.log(localize("c_channelNotFound"));
		} else {
			var time = Math.max(Date.now() + 1000, message.content.substr(10).trim() * 1000);
			if (!isNaN(time)) {
				settings.schedule.push(time);
				checkSchedule();
				console.log(localize("d_schedule", "${time}", new Date(time).toUTCString()));
				triviaChannel.send("*" + localize("d_schedule", "${time}", new Date(time).toUTCString()) + "*");
			}
		}
	}
	
	else if (line === "!emoji") {
		var allEmoji = "Emoji: " + fs.readFileSync("local_" + settings.lang + ".txt", "utf8").replace(/^\uFEFF/, '').match(/<:.*?:\d*?>/g).join();
		console.log(allEmoji);
		triviaChannel.send(allEmoji);
	}
	
	else if (line === "!randomize") {
		randomizeQuestions();
	}

	else {
		try {
			eval(line);
		} catch(err) {
			console.log(localize("c_invalid"));
		}
	}
});

bot.on('ready', () => {
	if (settings.triviaChannel) {
		bot.channels.fetch(settings.triviaChannel).then((channel) => {
			triviaChannel = channel;
		});
	}
	if (settings.musicChannel) {
		bot.channels.fetch(settings.musicChannel).then((channel) => {
			musicChannel = channel;
		});
	}
	console.log(localize("c_startBot"));
	bot.user.setPresence({status: "idle", activity: {type: 0, name: ""}});
	checkSchedule();
});

questionNum--;
bot.login(settings.token).catch(err => {
	console.log(localize("c_loginError"));
	process.exit();
});

// exit handling stuff
process.stdin.resume();
process.on('unhandledRejection', r => console.log(r));
process.on('uncaughtException', e => console.log(e));

function exitHandler() {
	if (!exit) {
		exit = true;
		if (trivia) {
			triviaChannel.send(localize("d_terminate"), {tts: settings.tts});
		}
		console.log(localize("c_terminate"));
		bot.destroy();
		if (trivia && players.length > 0) {
			outputScores(true);
		}
		process.exit();
	}
}

if (!settings.debug) {
	rl.on('SIGINT', exitHandler.bind(null));
	process.on('exit', exitHandler.bind(null));
	process.on('SIGINT', exitHandler.bind(null));
}

$(document).ready(function() {
    document.getElementById('ydk-import').addEventListener('change', function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            var deck = getDeckByYDK(e.target.result);
            deckCheck(deck);
        };
        reader.readAsText(file);
    });

    document.getElementById('text-import').addEventListener('input', function() {
        var file = document.getElementById('text-import').value;
        var deck = getDeckByText(file);
        deckCheck(deck);
    });

    document.getElementById('clear').addEventListener('click', function() {
        document.getElementById('text-import').value = "";
    });
});

function getDeckByYDK(ydk) {
    var ids = ydk.split("\n");
    var deck = {};

    fetch("https://raw.githubusercontent.com/CrimsonVolt/FK-Deck-Check/main/cards.json")
    .then((response) => response.text())
    .then((data) => {
        let cards = new Object();
        cards = JSON.parse(data)

        ids.forEach(id => {
            id = id.trim();
            if (!isNaN(id) && id.length > 0) {
                var card = cards[id];
                if (card) {
                    if (deck[card]) {
                        deck[card]++;
                    } else {
                        deck[card] = 1;
                    }
                }
            }
        });
    });

    return deck;
}

function getDeckByText(text) {
    var cards = text.split("\n");
    var deck = {};

    cards.forEach (card => {
        card = splitNameNumber(card);
        if(card) {
            var name = card[0];
            var amount = card[1];
            deck[name] = amount;
        }
    });

    return deck;
}

function splitNameNumber(inputString) {
    const pattern = /^(?:([1-6])x|x?([1-6])\s+)?\s*(.+?)\s*(?:x?([1-6])|([1-6])x)?$/;
    const match = inputString.match(pattern);

    if (match) {
        // Extract the number from possible groups and default to 1 if not found
        const number = match[1] || match[2] || match[4] || match[5];
        let name = match[3].trim();
        if (number) {
            return [name, parseInt(number, 10)];
        }
    }
    return null;
}

function deckCheck(deck) {
    console.log(deck);
    var valid = true;
    var tooMany = false;

    //Limitations
    var restricts = {"Semi-Forbidden": 1, "Restricted": 5, "Semi-Restricted": 10};
    let rList = {
        "1" : {},
        "5" : {},
        "10" : {},
    };

    var limits = {"Forbidden": 0, "Limited": 1, "Semi-Limited": 2};
    let banlist = {
        "0" : {},
        "1" : {},
        "2" : {},
    };
    
    fetch("https://raw.githubusercontent.com/CrimsonVolt/FK-Deck-Check/main/banlist.json")
    .then((response) => response.text())
    .then((data) => {
        let bans = new Object();
        bans = JSON.parse(data)
        for (card in deck) {
            var count = deck[card];

            if (Object.keys(bans).some(ban => ban.toLowerCase() === card.toLowerCase())) {
                var key = Object.keys(bans).find(key => key.toLowerCase() === card.toLowerCase());
                var limit = bans[key]

                switch (limit) {
                    case "Semi-Forbidden":
                    case "Restricted":
                    case "Semi-Restricted":
                        if(rList[restricts[limit]][card]) {
                            rList[restricts[limit]][card] += count;
                        } else {
                            rList[restricts[limit]][card] = count;
                        }
                        break;
                    case "Forbidden":
                    case "Limited":
                    case "Semi-Limited":
                        if(banlist[limits[limit]][card]) {
                            banlist[limits[limit]][card] += count;
                        } else {
                            banlist[limits[limit]][card] = count;
                        }
                        break;
                }
            } else if (count > 3) {
                valid = false;
                tooMany = true;
            }
        }

        var output = "";
        for (var res in restricts) {
            var limit = restricts[res];
            var total = 0;
            output += res + ": LIMIT " + limit + "<br>";

            var list = rList[limit];
            for (var card in list) {
                var count = list[card];
                output += card + ": " + count + "<br>";
                total += count;
            }
            output += "Total: " + total + "<br><br>";
            if (total > parseInt(limit)) {
                valid = false;
            }
        }

        for (var limitation in limits) {
            var limit = limits[limitation];
            var list = banlist[limit];
            if (Object.keys(list).length > 0) {
                valid = false;
                output += limitation + ": <br>";
                for (var card in list) {
                    var count = list[card];
                    output += card + ": " + count + "<br>";
                }
                output += "<br>";
            }
        }

        var validity = "";
        if (valid) {
            validity = "List is valid!<br>Disclaimer: Does not check for correct deck size or certain alt art cards.<br><br>";
        } else if (tooMany) {
            validity = "List is invalid!<br>You have over 3 copies of a card.<br><br>";
        } else {
            validity = "List is invalid!<br><br>";
        }
        
        var html = document.getElementById("output");
        html.innerHTML = validity + output;
    });
}

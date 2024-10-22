$(document).ready(function() {
    document.getElementById('input').addEventListener('change', function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            deckCheck(e.target.result);
        };
        reader.readAsText(file);
    });
});

function list() {
    let dict = new Object();
    fetch(
        "https://raw.githubusercontent.com/CrimsonVolt/FK-Deck-Check/main/FK102024.lflist.conf"
    )
        .then((response) => response.text())
        .then((data) => {
            var cards = data.split("\n");
            for (let i = 0; i < cards.length; i++) {
                var card = cards[i].split("--");
                var props = card[0].split(" ")
                if(!isNaN(props[0]) && props[0].length > 0) {
                    dict[props[0]] = [card[1], props[1]];
                }
            }
        });
    console.log(dict);
}

function deckCheck(deckString) {
    var cards = deckString.split("\n");
    var deck = {};
    var valid = true;
    var tooMany = false;

    cards.forEach(card => {
        card = card.trim();
        if (!isNaN(card) && card.length > 0) {
            if (deck[card]) {
                deck[card]++;
            } else {
                deck[card] = 1;
            }
        }
    });

    console.log(deck);

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
        for (id in deck) {
            var count = deck[id];
            if (id in bans) {
                var name = bans[id][0];
                var limit = bans[id][1];

                switch (limit) {
                    case "Semi-Forbidden":
                    case "Restricted":
                    case "Semi-Restricted":
                        if(rList[restricts[limit]][name]) {
                            rList[restricts[limit]][name] += count;
                        } else {
                            rList[restricts[limit]][name] = count;
                        }
                        break;
                    case "0":
                    case "1":
                    case "2":
                        if (count > parseInt(limit)) {
                            if(banlist[limit][name]) {
                                banlist[limit][name] += count;
                            } else {
                                banlist[limit][name] = count;
                            }
                        }
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

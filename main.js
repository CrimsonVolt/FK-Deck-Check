$(window).on('load', async function() {
    $('body').css('visibility', 'visible'); // Show body when fully loaded
    await fetchBanlist(); // Fetch the banlist first
});

$(document).ready(function() {
    document.getElementById('ydk-import').addEventListener('change', async function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            var deck = await getDeckByYDK(e.target.result);
            await deckCheck(deck);
        };
        reader.readAsText(file);
    });

    document.getElementById('text-import').addEventListener('input', async function() {
        var file = document.getElementById('text-import').value;
        var deck = getDeckByText(file);
        await deckCheck(deck);
    });

    document.getElementById('clear').addEventListener('click', function() {
        document.getElementById('text-import').value = "";
    });

    document.getElementById('show-details').addEventListener('click', function() {
        document.getElementById('details-container').style.display = "block";
        document.getElementById('show-details').style.display = "none";
    });
});

// Global Variables
let restricts = {"Semi-Forbidden": 1, "Restricted": 5, "Semi-Restricted": 10};
let limits = {"Forbidden": 0, "Limited": 1, "Semi-Limited": 2};
let bans = {};
let normalizedBans = {};

// Function to fetch the banlist
async function fetchBanlist() {
    try {
        const response = await fetch("https://raw.githubusercontent.com/CrimsonVolt/FK-Deck-Check/main/banlist.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        bans = await response.json();
        console.log("Banlist loaded:", bans);

        // Normalize keys to lowercase
        normalizedBans = Object.fromEntries(Object.entries(bans).map(([key]) => [key.toLowerCase(), key]));
    } catch (error) {
        console.error("Error fetching banlist:", error);
    }
}

async function getDeckByYDK(ydk) {
    var ids = ydk.split("\n");
    var deck = {};

    const response = await fetch("https://raw.githubusercontent.com/CrimsonVolt/FK-Deck-Check/main/cards.json");
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.text();
    let cards = JSON.parse(data);

    ids.forEach(id => {
        id = id.trim();
        if (!isNaN(id) && id.length > 0) {
            var card = cards[id];

            // Add ID instead of name if unknown
            if (!card) {
                card = id;
            }  
            
            // Add card to deck or additional copies
            if (deck[card]) {
                deck[card]++;
            } else {
                deck[card] = 1;
            }
        }
    });
    
    return deck; // Return populated deck after fetching
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
    const pattern = /^(?:([1-6])x|x?([1-6])\s+)?\s*(.+?)\s*(?:x([1-6])|([1-6])x)?$/;
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

// Function to check the deck
async function deckCheck(deck) {
    let valid = true;
    let validCount = true;
    let deckCount = 0;

    // Limitations
    const rList = { "1": {}, "5": {}, "10": {} };
    const banlist = { "0": {}, "1": {}, "2": {} };

    for (let card in deck) {
        const count = deck[card];
        deckCount += count;
        const normalizedCard = card.toLowerCase().trim();

        if (normalizedBans[normalizedCard]) {
            card = normalizedBans[normalizedCard];
            const limit = bans[card];

            switch (limit) {
                case "Semi-Forbidden":
                case "Restricted":
                case "Semi-Restricted":
                    rList[restricts[limit]][card] = (rList[restricts[limit]][card] || 0) + count;
                    break;
                case "Forbidden":
                case "Limited":
                case "Semi-Limited":
                    if (count > limits[limit]) {
                        banlist[limits[limit]][card] = (banlist[limits[limit]][card] || 0) + count;
                    }
                    break;
            }
        } else if (count > 3) {
            validCount = false;
        }
    }

    // Output results
    generateOutput(valid, validCount, deckCount, rList, banlist);
}

// Function to generate output
function generateOutput(valid, validCount, deckCount, rList, banlist) {
    let output = "";

    for (let res in restricts) {
        const limit = restricts[res];
        let total = 0;
        output += `${res}: LIMIT ${limit}<br>`;
        
        for (let card in rList[limit]) {
            const count = rList[limit][card];
            output += `${card}: ${count}<br>`;
            total += count;
        }
        
        output += `Total: ${total}<br><br>`;
        if (total > parseInt(limit)) valid = false;
    }

    for (let limitation in limits) {
        const limit = limits[limitation];
        if (Object.keys(banlist[limit]).length > 0) {
            valid = false;
            output += `${limitation}: <br>`;
            for (let card in banlist[limit]) {
                const count = banlist[limit][card];
                output += `${card}: ${count}<br>`;
            }
            output += "<br>";
        }
    }

    let msg = (valid && validCount && (deckCount >= 40 && deckCount <= 90)) ? "List is valid!<br>" : "List is invalid!<br>";
    msg += valid ? "" : "Does not follow the banlist.<br>"
    msg += validCount ? "" : "You have over 3 copies of a card.<br>"
    msg += (deckCount < 40) ? "Not enough cards in deck.<br>" : (deckCount > 90) ? "Too many cards in deck.<br>" : "";
    msg += "<br>"

    document.getElementById("output").style.display = "block";
    document.getElementById("validity").innerHTML = msg;
    document.getElementById("details").innerHTML = output;
}
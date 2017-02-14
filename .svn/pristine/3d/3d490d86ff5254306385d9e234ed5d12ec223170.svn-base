
var ws = {};
var user = {
    username: bag.session.username,
    name: bag.session.name,
    role: bag.session.role
};
var panels = [
    {
        name: "bonds",
        formID: "tradeFilter",
        tableID: "#tradesBody",
        filterPrefix: "trade_"
    },
    {
        name: "audit",
        formID: "auditFilter",
        tableID: "#auditBody",
        filterPrefix: "audit_"
    }
];

// =================================================================================
// On Load
// =================================================================================
$(document).on('ready', function () {
    connect_to_server();
    if (user.name) $("#userField").html(user.name.toUpperCase() + ' ');

    // Customize which panels show up for which user
    $(".nav").hide();
    console.log("user role", bag.session.user_role);

    // Only show tabs if a user is logged in
    if (user.username) {

        // Display tabs based on user's role
        if (user.role && user.role.toUpperCase() === "auditor".toUpperCase()) {
            $("#auditLink").show();
            //$("#termsLink").show();
        } else if (user.username) {
            $("#createLink").show();
            $("#tradeLink").show();
        }
    } else {

        // Display the login and user registration links
        $("#loginLink").show();
        $("#registerLink").show();
    }

    // =================================================================================
    // jQuery UI Events
    // =================================================================================
    $("#submit").click(function () {
        
        if (user.username) {
            
            var obj = {
                type: "createBond",
                bond: {
                    name:escapeHtml($("input[name='bondName']").val()),
                    principal: escapeHtml($("select[name='principal']").val()),
                    //qty: Number($("select[name='qty']").val()),
                    rate:escapeHtml($("input[name='rate']").val()),
                    maturity: escapeHtml($("input[name='mdate']").val()),
                    leadmanager: {
                        name: user.username
                    },
                    //owner: [],
                    issuer: escapeHtml($("input[name='issuer']").val()),
                    issueDate: (new Date()).toString().split(' ').splice(1,3).join(' ')
                },
                user: user.username
            };
            if (obj.bond) {
                //obj.paper.ticker = obj.paper.ticker.toUpperCase();
                //console.log(JSON.stringify(obj.bond))
                console.log('creating bond, sending', obj);
                ws.send(JSON.stringify(obj));
                $(".panel").hide();
                $("#bondsPanel").show();
            }
        }
        return false;
    });

    $("#update").click(function(){
        if(user.username && user.username.toLowerCase() == "rater"){
            var obj = {
                type: "updateBond",
                bondId: escapeHtml($("input[name='bondKey']").val()),
                term: "ratings",
                value: escapeHtml($("input[name='termRating']").val()),
                user: user.username
            }
        } else if (user.username && user.username.toLowerCase() == "identifier"){
            var obj = {
                type: "updateBond",
                bondId: escapeHtml($("input[name='bondKey']").val()),
                term: "identifier",
                value: escapeHtml($("input[name='termCusip']").val()),
                user: user.username
            }    
        }
        if(obj.bondId){
            ws.send(JSON.stringify(obj));
            $(".panel").hide();
            $("#bondsPanel").show();
        }
        return false;
    });

    $("#createLink").click(function () {
        $("input[name='name']").val('r' + randStr(6));
    });

    $("#tradeLink").click(function () {
        ws.send(JSON.stringify({type: "getAllBonds", v: 2, user: user.username}));
    });

     
    //login events
    $("#whoAmI").click(function () {													//drop down for login
        if ($("#loginWrap").is(":visible")) {
            $("#loginWrap").fadeOut();
        }
        else {
            $("#loginWrap").fadeIn();
        }
    });

    // Filter the trades whenever the filter modal changes
    $(".trade-filter").keyup(function () {
        "use strict";
        console.log("Change in trade filter detected.");
        processFilterForm(panels[0]);
    });
    $(".audit-filter").keyup(function () {
        "use strict";
        console.log("Change in audit filter detected.");
        processFilterForm(panels[1]);
    });

    // Click events for the columns of the table
    $('.sort-selector').click(function () {
        "use strict";
        var sort = $(this).attr('sort');

        // Clear any sort direction arrows
        $('span').remove('.sort-indicator');

        // Clicking the column again should reverse the sort
        if (sort_papers[sort] === sort_selected) {
            console.log("Reversing the table");
            sort_reversed = !sort_reversed;
        }
        else sort_reversed = false;

        // Add the appropriate arrow to the current selector
        var arrow_icon = (sort_reversed ? 'fa-arrow-up' : 'fa-arrow-down');
        var span = document.createElement('span');
        span.classList.add('fa');
        span.classList.add(arrow_icon);
        span.classList.add('sort-indicator');
        $(this).append(span);

        // Change to the sort corresponding to that column
        sort_selected = sort_papers[sort];
        console.log("Sorting by:", sort);
        for (var i in panels) {
            build_trades(bag.papers, panels[i]);
        }
    });

    //trade events
    $(document).on("click", ".buyPaper", function () {
        if (user.username) {
           
            
            var cusip = $(this).attr('data_cusip');
            var issuer = $(this).attr('data_issuer');

            // TODO Map the trade_pos to the correct button
            var msg = {
                type: 'getBond',
                transfer: {                 
                    CUSIP: cusip,                 
                },
                user: user.username
            };
            console.log('sending', msg);
             
             ws.send(JSON.stringify(msg));           
        }
    });
});


// =================================================================================
// Helper Fun
// =================================================================================
function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// =================================================================================
// Socket Stuff
// =================================================================================
function connect_to_server() {
    var connected = false;
    connect();

    function connect() {
        var wsUri = '';
        console.log('protocol', window.location.protocol);
        if (window.location.protocol === 'https:') {
            wsUri = "wss://" + bag.setup.SERVER.EXTURI;
        }
        else {
            wsUri = "ws://" + bag.setup.SERVER.EXTURI;
        }

        ws = new WebSocket(wsUri);
        ws.onopen = function (evt) {
            onOpen(evt);
        };
        ws.onclose = function (evt) {
            onClose(evt);
        };
        ws.onmessage = function (evt) {
            onMessage(evt);
        };
        ws.onerror = function (evt) {
            onError(evt);
        };
    }

    function onOpen(evt) {
        console.log("WS CONNECTED");
        connected = true;
        clear_blocks();
        $("#errorNotificationPanel").fadeOut();
        ws.send(JSON.stringify({type: "chainstats", v: 2, user: user.username}));
        ws.send(JSON.stringify({type: "getAllBonds", v: 2, user: user.username}));        
    }

    function onClose(evt) {
        console.log("WS DISCONNECTED", evt);
        connected = false;
        setTimeout(function () {
            connect();
        }, 5000);					//try again one more time, server restarts are quick
    }

	function onMessage(msg) {
		try {
			var data = JSON.parse(msg.data);
			//console.log('rec', data);
			if (data.msg === 'bonds') {
				try{
					var bonds = JSON.parse(data.bonds);
                    console.log(data.user);
					console.log('!', bonds);
					if ($('#auditPanel').is){
						for (var i in panels) {
							build_trades(bonds, panels[i]);
						}
					}
				}
				catch(e){
					console.log('cannot parse bonds', e);
				}
			}
			else if (data.msg === 'chainstats') {
				//console.log(JSON.stringify(data));
				var e = formatDate(data.blockstats.transactions[0].timestamp.seconds * 1000, '%M/%d/%Y &nbsp;%I:%m%P');
				$("#blockdate").html('<span style="color:#fff">TIME</span>&nbsp;&nbsp;' + e + ' UTC');
				var temp = {
					id: data.blockstats.height,
					blockstats: data.blockstats
				};
				new_block(temp);									//send to blockchain.js
			}
			else if (data.msg === 'reset') {
				// Ask for all available trades and information for the current company
				ws.send(JSON.stringify({type: "getAllBonds", v: 2, user: user.username}));
                ws.send(JSON.stringify({type: "chainstats", v: 2, user: user.username}));
				
			}
            else if (data.msg === 'bond'){

                $(".panel").hide();
                $("#termsPanel").show();
                build_terms(JSON.parse(data.bond))
                //console.log(JSON.parse(data.bond))
            }
			else if (data.type === 'error') {
				console.log("Error:", data.error);
			}
		}
		catch (e) {
			//console.log('ERROR', e);
			//ws.close();
		}
	}

    function onError(evt) {
        console.log('ERROR ', evt);
        if (!connected && bag.e == null) {											//don't overwrite an error message
            $("#errorName").html("Warning");
            $("#errorNoticeText").html("Waiting on the node server to open up so we can talk to the blockchain. ");
            $("#errorNoticeText").append("This app is likely still starting up. ");
            $("#errorNoticeText").append("Check the server logs if this message does not go away in 1 minute. ");
            $("#errorNotificationPanel").fadeIn();
        }
    }

    function sendMessage(message) {
        console.log("SENT: " + message);
        ws.send(message);
    }
}



function build_terms(bond){
         console.log(user);
        $("input[name='bondKey']").val(bond.key)
         $("input[name='termissuer']").val(bond.Issuer)
         $("input[name='termBondName']").val(bond.name)

         if(user.name.toLowerCase() != "identifier"){
            $("input[name='termCusip']").prop('disabled', true);
         }
         $("input[name='termCusip']").val(bond.Identifiers)   
         $("input[name='termRate']").val(bond.rate)
         $("input[name='termMdate']").val(bond.maturity)
         
         $("input[name='termRating']").val(bond.rating.string)
         if(user.name.toLowerCase() != "rater"){
            $("input[name='termRating']").prop('disabled', true);
         }
}

function build_trades(bonds, panelDesc) {

    if (bonds && bonds.length > 0) {

       
        if (!panelDesc) {
            panelDesc = panels[0];
        }

        bonds.sort(sort_selected);
        if (sort_reversed) bonds.reverse();

        // Display each entry as a row in the table
        var rows = [];
        var style = null;
        for (var i in bonds){
            var data = [
                  bonds[i].issueDate
                , bonds[i].name
                , formatMoney(bonds[i].principal)
                , bonds[i].rate
                , bonds[i].maturity
                , bonds[i].Issuer
                , bonds[i].leadmanager.name
                , bonds[i].rating.string
            ]

        var row = createRow(data);
        style && row.classList.add(style);
        
                        var disabled = true
                        //this can be implemented at the smart contract level as well, for the demo it is implemented on the username
                        if (user.name.toLowerCase() === "rater") disabled = false;
                        if (user.name.toLowerCase() === "identifier") disabled = false;
                        var button = rateButton(disabled, bonds[i].key, bonds[i].Issuer, user.name);
                        row.appendChild(button);
        
        rows.push(row);
        }

       

        // Placeholder for an empty table
        var html = '';
        if (rows.length == 0) {
            if (panelDesc.name === 'trade')
                html = '<tr><td>nothing here...</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
            else if (panelDesc.name === 'audit')
                html = '<tr><td>nothing here...</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'; // No action column
            $(panelDesc.tableID).html(html);
        } else {
            // Remove the existing table data
            console.log("clearing existing table data");
            var tableBody = $(panelDesc.tableID);
            tableBody.empty();


            // Add the new rows to the table
            console.log("populating new table data");
            var row;
            while (rows.length > 0) {
                row = rows.shift();
                tableBody.append(row);
            }
        }
    } else {
        if (panelDesc.name === 'trade')
            html = '<tr><td>nothing here...</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
        else if (panelDesc.name === 'audit')
            html = '<tr><td>nothing here...</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'; // No action column
        $(panelDesc.tableID).html(html);
    }
}


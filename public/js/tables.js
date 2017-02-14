/**
 * Created by davery on 3/29/2016.
 */
"use strict";
function createRow(data) {
    var tr = document.createElement('tr');

    for (var index in data) {
        var td = document.createElement('td');
        tr.appendChild(td);

        var text = document.createTextNode(data[index]);
        td.appendChild(text);
    }

    return tr;
}

function rateButton(disabled, cusip, issuer, user) {
    var button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.setAttribute('data_cusip', cusip);
    button.setAttribute('data_issuer', issuer);
    if(disabled) button.disabled = true;
    button.classList.add('buyPaper');
    button.classList.add('altButton');

    var span = document.createElement('span');
    span.classList.add('fa');
    span.classList.add('fa-exchange');
    if (user.toLowerCase() === "rater"){
        span.innerHTML = ' &nbsp;&nbsp;Rate Issue';    
    } else if (user.toLowerCase() === "identifier")
    {
        span.innerHTML = ' &nbsp;&nbsp;Identify Issue';  
    } else {
        span.innerHTML = ' &nbsp;&nbsp;Next Action';  
    }
    button.appendChild(span);

    // Wrap the buy button in a td like the other items in the row.
    var td = document.createElement('td');
    td.appendChild(button);

    return td;
}

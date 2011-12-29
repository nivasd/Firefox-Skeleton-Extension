
var g_testing = false;

function init_html_pane()
{
    try
    {
        populate_regex_list();
        populate_html_edit();
    }
    catch(e)
    {
        alert(' init html pane:\n' + e);
    }
}

function get_regex_items()
{
    var regex_items =
    [
        {
            name:'name 1',
            comment:'comment 1',
            regex:'regex 1'
        },
        {
            name:'r name 2',
            comment:'r comment 2',
            regex:'r regex 1'
        }
    ];

    return regex_items;
}

function populate_regex_list()
{
    try
    {
        var regex_list = document.getElementById('html-regex-list');

        regex_list_items = get_regex_items();

        for( var item in regex_list_items )
        {
            var row = document.createElement('listitem');
            row.setAttribute('value', item.name);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', item.name);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', item.comment);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', item.regex);
            row.appendChild(cell);

            var appended = regex_list.appendChild(row);
        }
    }
    catch(e)
    {
        alert("populate regex list\n" + e);
    }
}

// todo: move code to one place
function get_current_html()
{
    var html = '';
    try
    {
        var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator)
                            .getMostRecentWindow("navigator:browser");
        var currBrowser = currentWindow.getBrowser();
        var contentDoc = currBrowser.contentDocument;
        html = contentDoc.body.innerHTML;
    }
    catch(e)
    {
        html = 'exception, failed to get html:\n' + e;
    }
    return html;
}


function populate_html_edit()
{
    try
    {
        var html = get_current_html();
        document.getElementById('html-content-details').value = html;
    }
    catch(e)
    {
        alert('populate html edit:\n' + e);
    }
}

function update_experiment_display()
{
    var html = get_current_html();
    var exps = active_page_abacus.gather_abacus( html );
}
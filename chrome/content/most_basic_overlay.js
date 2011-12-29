
function populate_menus()
{
    dump('populate menus was called\n');
}

function on_menu_go()
{
    dump('on menu go enter\n');

    var textBox = document.getElementById('toolbar-text-id');
    var text = textBox.value;
    dump('on menu go ' + text + '\n');

    alert('on menu go ' + text + '\n');
}

function on_menu_basic_change()
{
    dump('on menu basic change\n');
}
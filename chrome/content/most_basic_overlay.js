
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

function on_basic_menu_select(idval) {
   var n = document.getElementById(idval).value;  
   alert(n); 
   switch (n)
   {
     case 1: 
             //alert("hello Nivas");  
	     break; 
     case 2: 
             break; 
     default: 

       

   }


}

function on_menu_basic_change()
{
    dump('on menu basic change\n');
}

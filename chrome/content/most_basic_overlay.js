
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
   var second_menu = document.getElementById("toolbar-basic-choice")
   switch (n)
   {
     case '1':
             second_menu.removeAllItems();
	     second_menu.appendItem("AdManager", "http://admanager.idx.expedmz.com:7001/AdManagerWebStart/");
	     second_menu.appendItem("AdInsight", "http://adreports.expedia.com/");
	     second_menu.appendItem("InventoryManager", "http://adreports.expedia.com/");
	     second_menu.appendItem("DoubleClick Object Locator", "http://admanager.idx.expedmz.com:7001/Servlets/DCLKObjectLocator");
	     break; 
     case '2': 
             second_menu.removeAllItems();
	     second_menu.appendItem("AdManager - Ads01", "http://admanagerdev.karmalab.net:7001/AdManagerWebStart/");
	     second_menu.appendItem("AdManager - Main01, Rc01, Hf01, etc.", "http://admanager.karmalab.net:7001/AdManagerWebStart/");
	     second_menu.appendItem("DoubleClick Object Locator - Ads01", "http://cheldfemgr01:7001/Servlets/DCLKObjectLocator");
	     second_menu.appendItem("DoubleClick Object Locator - Main01, Rc01, Hf01, etc.", "http://chelmgrads001:7001/Servlets/DCLKObjectLocator");
	     
	     break;
     case '3': 
             second_menu.removeAllItems();
	     second_menu.appendItem("Splunk - Ads", "https://10.94.8.157/en-US/app/Ads/flashtimeline");
	     second_menu.appendItem("Zenoss Production", "https://phmxmonzen001.mgt.expecn.com/zport");
	     break;
    case '4': 
             second_menu.removeAllItems();
	     second_menu.appendItem("Foresite", "http://foresite/");
	     second_menu.appendItem("SalesForce", "http://admanager.karmalab.net:7001/AdManagerWebStart/");
	     
	     break;
    case '5': 
             second_menu.removeAllItems();
	     second_menu.appendItem("Troubleshooting Ads", "http://confluence/display/med/DE7+Linux+-+Troubleshooting+Ads");
	     second_menu.appendItem("Email adsup@expedia.com", "mailto:adsup@expedia.com?subject=Ad%20Support:&body=Dear%20Adsup");
	     second_menu.appendItem("Email badad@expedia.com",  "mailto:badad@expedia.com?subject=Bad%20Ad:&body=Hello&20Bad%20Ad");
	     
	     break;

     default: 

       

   }
   second_menu.selectedIndex=0; 

}


function on_second_menu_change(idval)
{
   var n = document.getElementById(idval).value; 
   dump(n);  
   var pattern = /mailto/; 
   if (pattern.test(n)) {
      window.open(n, 'emailWindow');  } 
   else {
      window.open(n, '_newtab');  }  
}

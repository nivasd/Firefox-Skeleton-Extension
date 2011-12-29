/******************************************************************************
    File   : Debug.js
    Author : Maxim Kazitov
    E-Mail : mvkazit@tut.by
******************************************************************************/
function jsDebug() {
    this.enabled = true;
    this.type    = "stdout";
    this.console = null;
}

jsDebug.prototype={
    constructor : jsDebug,

    print:function(msg, msg_type) {
        with(this) {
            if(!enabled){
                return false;
            }
            try {
                switch(type) {
                    case "stdout" :
//                          WScript.StdOut.write(msg);
                        WScript.Echo(msg);
                        break;
                    case "html"   :
                        //console.document.writeln(msg);
                        if(console==null) {
                            console = self.open("Console.html","DBG_CONSOLE","left=200,height=300,width=800,status=no,toolbar=no,menubar=no,location=no,scrollbars=yes,resizable=yes");
                        }
                        var spn = console.document.createElement("<SPAN>");
                        spn.innerHTML = msg;
                        switch(msg_type) {
                            case "error" :
                                spn.style.color = "#FF0000";
                                break;
                        }
                        console.document.body.insertAdjacentElement("beforeEnd",spn);
                        spn.scrollIntoView(false);
                        break
                }
            } catch (e) {}
        }
    },

    getSuffix:function() {
        with(this) {
            var suf = "";
            switch(type) {
                case "stdout" :
                    suf = "\n";
                    break;
                case "html"   :
                    suf = "<BR>";
                    break
            }
            return suf;
        }
    },

    println:function(msg) {
        with(this) {
            print(msg + getSuffix(), "message");
        }
    },

    printException:function(msg, e) {
        with(this) {
            print(msg+getSuffix(), "error");
            if (e) {
                try {
                    print(" Exception : "+ e.message + getSuffix(), "error");
                } catch (e) {}
            }
        }
    }
}

dbgOut = new jsDebug();

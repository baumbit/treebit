# Development
First read and follow the instructions in ./docs/install.md

The launcher can be started in development mode, which adds some developer support (such as server restart when files are updated) to the environment:
$ ./bin/launch.sh --dev

## How to add development certificate on an iPhone
TODO

## How to connect MacOS laptop Safari debugging tools, to Safari on iPhone
Setup the iPhone
    * Connect the iPhone to a MacOS laptop with a physical cable.
    * On the iPhone, click “Trust this device”.
    * Connect to WiFi.
Setup the MacOS laptop
    * Connect to the same WiFi as the iPhone is connected to.
    * Open "System Preferences" -> "Sharing".
    * Write a "Computer Name" in the input field that has all lower case.
            Example: my-mac
    * If the "Internet Sharing" is enabled, uncheck it!
    * Open "Internet Sharing" -> In "To computers using" list, select "iPhone USB".
    * Enable "Internet Sharing" checkbox. Click "Yes" when promted.
    * You will now be able to reach the MacOS laptop from the iPhone using the computer name you inputed earlier.
            Example: http://my-mac.local
Setup Safari built-in debugging tools:
    * On the iPhone, open "Settings" -> scroll down and select "Safari" -> select "Advanced" -> toggle on "Web Inspector".
    * On the MacOS laptop open "Safari" -> open "Preferences" from tobar menu -> Enable "Show Develop menu in menu bar".
    * Make sure iPhone is awake and on the MacOS laptop, open "Safari" -> open "Develop" from topbar menu -> select "iPhone" -> click "Connect via network" (menu item will not show if phone is asleep).
    * On the iPhone open "Safari" and in location field input: http://<MacOS laptop computer name>.local:<port>
        Example: http://my-mac.local
    * On the MacOS laptop open "Safari" -> open "Develop" -> select "iPhone" -> select "<MacOS laptop computer name> - <browser tab name>".
    * Now a live debugger should open on the MacOS laptop, with an interface to the page you are browsing on Safari on the iPhone.
Troubleshooting:
    If MacOS laptop is un-reachable from the iPhone, you might have to do one or more of the following:
    * Disable the MacOS laptop firewall.
    * Explicitly bind the IP when running the server command on your MacOS laptop.
        Rails: Add a binding flag: "rails s -b 0.0.0.0" Then connect using: "http://my-mac.local:9002"
    If the MacOS laptop is reachable from the iPhone, but Safari is unable to access the page:
    * Verify that you have launched the hotel server (@see ./docs/install.md) and that the port is correct. Treehut Hotel default port is 9002.
        Example:
            MacOS mac latop terminal: ./bin/launch.sh --dev --tor-port=false
            iPhone Safari location: http://<MacOS laptop computer name>.local:9002


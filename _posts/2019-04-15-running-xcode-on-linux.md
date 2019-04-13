---
layout: post
title: Developing mobile iOS applications on GNU/Linux with Re-Natal
author: Filip Bielejec
comments: true
categories: [clojurescript, re-natal, react-native, iOS, mobile development, linux, xcode, virtualbox]
tags: [clojurescript, iOS, linux, xcode]
summary: "How to develop mobile iOS applications on Linux"
---

# <a name="intro"> Intro </a>

If you are a developer writing mobile applications in the year 2019, chances are you are working with React Native.
React Native workflow is split into two separate steps.
One is the packager, an engine which lets you work with native mobile UI components through JavaScript, that reloads every time you save your JavaScript code.

The other is the simulator.
Unfortunately, to run the iOS simulator and do any kind of iOS development you need a macOS and the XCode IDE.
If you're like me, my Linux setup is just paramount to my productivity and I can't imagine working without e.g. a tiling window manager or keyboard shortcuts perfected by the years of practice :)

In this blog post I will show you the setup and workflow that allows you to write your code in the OS and code editor of your choice<sup>[1](#footnote1)</sup>, while still running the iOS simulator.

---
**Re-Natal**

[Re-Natal](https://github.com/drapanjanas/re-natal) is a CLI tool to automate the setup of a React Native app running on ClojureScript.
In a few simple commands it will bootstrap a skeleton application with reagent + re-frame, REPL and hot reloading (using [Figwheel](https://github.com/bhauman/lein-figwheel)) directly to the simulated iOS device, just like you would if it was a web app running in a browser.

---

If you like the idea let's get started.

We are going to install all the neccessary development tools on the host machine, and just the bare minimum required to run the iOS simulator on a guest macOS running in a VirtualBox, then make the two machines talk to each other via forwarded ports.

# <a name="virtualbox"> Running macOS in a VirtualBox </a>

Begin by insatlling VirtualBox 6.X for your distribution, you can get it from [here](https://www.virtualbox.org/wiki/Linux_Downloads) or directly from your OS repositories:

```bash
sudo apt install virtualbox virtualbox-dkms virtualbox-ext-pack virtualbox-guest-additions-iso virtualbox-guest-utils virtualbox-qt
```

Now download the vmdk with macos, for example from [Techsviewer](https://techsviewer.com/install-macos-high-sierra-vmware-windows-pc/).
Launch VB and create new virtual machine from the image.
Make sure to name the VM without using spaces (e.g. _macos_).
Give the machine at least 2 cores, 4GB of RAM, and 128MB of graphics with 3D acceleration turned on, set the VB Network Adapter to Bridged:

![_config.yml]({{ site.baseurl }}/images/2019-04-15-running-xcode-on-linux/virtualbox.jpg)

Close Virtualbox for now.
Now you can download the [setup script](https://github.com/hkdb/VBoxMacSetup), graciously made availiable by [hkdb](https://github.com/hkdb).

Save the script, make it executable and call it with the name of your vm and the desired resolution as the arguments:

```bash
./setup.sh -v "macos" -r 1920x1080
```

Launch VirtualBox again and start the MacOS VM.

# <a name="xcode"> Install XCode </a>

Once the VM boots you can install the XCode version for the MacOS version you are running:

![_config.yml]({{ site.baseurl }}/images/2019-04-15-running-xcode-on-linux/xcode_versions.png)

You can use the App Store, or for the older versions of the IDE they can be downloaded from [here](https://developer.apple.com/download/more/).

Once installed launch Xcode, select menu > Preferences > Locations and choose your Xcode version from the dropdown:

![_config.yml]({{ site.baseurl }}/images/2019-04-15-running-xcode-on-linux/xcode.jpg)

# <a name="socat"> Install socat </a>

For bidirectional data communication between the Linux host and macOS guest we will use [socat](https://linux.die.net/man/1/socat).
MacOS doesn't have a native package manager, therefore we will need [Homebrew](https://brew.sh/) installed.
Start the Terminal and install it:

```bash
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

then using homebrew install socat:

```bash
brew install socat
```
We are done with the guest for now, lets go to the host and create our project.

# <a name="re-natal"> Create project </a>

Lets start by installing re-natal and react-native.
Both come as convenient node packages, that we can install globally:

```bash
npm install -g re-natal react-native
```

You will also need Leiningen and Java 8, but we won't cover installing them here.

Once that's done we can create the skeleton app.
Mind the CamelCase in the apps name:

```bash
re-natal init AppName -i reagent6
```

Now execute some basic setup commands that will bootstrap the app as an iOS project:

```bash
cd app-name/
re-natal use-ios-device simulator
re-natal use-figwheel
```

# <a name="sharing-folder"> Share the project folder </a>

We will need to share the projects directory with the guest.
In principle virtualbox can share folders betwen the host and the guest using [Guest Additions](https://www.virtualbox.org/manual/ch04.html), however I was unable to get it going<sup>[2](#footnote2)</sup>.

Instead I opted for using the [samba](https://www.samba.org/samba/) server.
Every major Linux distro should have it in its repositories:

```bash
sudo apt-get install samba
```

Now create a user (samba will prompt you for the password):

```bash
sudo smbpasswd -a <user_name>
```

Next edit the samba config:

```bash
sudo nano /etc/samba/smb.conf
```

Add to the end of the config, substitutting **path** with the path to the just created re-natal project and **user** with the created samba user:

```
[<folder_name>]
path = /home/<user_name>/<folder_name>
valid users = <user_name>
read only = no
```

You can test the config file for configuration errors by calling: `testparm` on the command line.
If all is fine with the config, go ahead and start the Samba service daemon plus enable it at startup:

```bash
systemctl restart smbd
systemctl enable smbd
```

# <a name="dev-tools"> Development tools: React Native and Figwheel </a>

We will now start the react-native packager, binding it to port 8081 and broadcasting on 0.0.0.0:

```bash
react-native start --host 0.0.0.0 --port 8081
```

Next we can start Figwheel, which will give us the REPL, as well as watch and recompile on source code changes:

```bash
lein figwheel ios
```

Figwheel will recompile the sources and just hang for now, waiting for connection with the simulator to give us the REPL, but not before printing the port on which it is running (3449 by default).
Last piece of information we need is the local IPv4 address of the host (e.g. `192.168.1.3`), which we can get with:

```
ifconfig
```

Now let's go back to the guest OS.

# <a name="run">Run the project </a>

On the guest we can now start listening on the ports occupied by the react-native and Figwheel servers:

```bash
socat tcp-listen:3449,reuseaddr,fork tcp:192.168.1.3:3449
socat tcp-listen:8081,reuseaddr,fork tcp:192.168.1.3:8081
```

Next lets mount the shared folder. 
Click on the Go -> **connect to server...**,  paste `smb://192.168.1.3` and click on **Connect**:

![_config.yml]({{ site.baseurl }}/images/2019-04-15-running-xcode-on-linux/connect.jpg)

When prompted for the username and password use the ones created when [Sharing the project folder](#sharing-folder).
by default the directory is mounted as `/Volumes/app-name/`.
Open this directory in XCode, wait until it indexes the project and run it.

Once the project is up and running Figwheel on the host box should now give you a fully functional REPL, with live reloading on code edits: 

![_config.yml]({{ site.baseurl }}/images/2019-04-15-running-xcode-on-linux/running-project.jpg)

From now on the workflow is quite snappy and un-obtrusive, you can for example keep you editor and the simulator tiled one next to the other and quickly iterate during development.

Thanks for reading!

---
<a name="footnote1">1</a>: Allthough I don't see how you could use anything else but Linux/Emacs combo. <br>
<a name="footnote2">2</a>: Please let me know in the comment box if you had any luck yourself and how have you done it.

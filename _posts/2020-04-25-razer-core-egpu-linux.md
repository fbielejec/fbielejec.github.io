---
layout: post
title: How to setup Razer Core external GPU on GNU/Linux
author: Filip Bielejec
comments: true
categories: [GPU, Linux, Nvidia]
summary: "With this setup I should be able to enjoy the crisp graphics provided by the GPU"
---

# <a name="plugging"/> Plugging in the card

Initial setup could not be easier - slide out the enclosure, put the card into a PCI slot, close it, connect power, HDMI and thunderbolt cables and slide the enclosure back in.

![_config.yml]({{ site.baseurl }}/images/2020-04-25-razer-core-egpu-linux/IMG_20200425_164511.jpg)

Thunderbolt device is immediately recognized, nice.

```shell
filip@filip-Meerkat:~$ boltctl
 ● Razer Core
   ├─ type:          peripheral
   ├─ name:          Core
   ├─ vendor:        Razer
   ├─ status:        authorized
   │  ├─ domain:     domain0
   │  └─ authflags:  boot
   ├─ authorized:    Sat 25 Apr 2020 12:23:40 PM UTC
   ├─ connected:     Sat 25 Apr 2020 12:23:40 PM UTC
   └─ stored:        Thu 23 Apr 2020 05:10:11 PM UTC
      ├─ policy:     auto
      └─ key:        no
```

Nvidia GPU is listed among the PCI devices:

```shell
filip@filip-Meerkat:~$ lspci
00:00.0 Host bridge: Intel Corporation 8th Gen Core Processor Host Bridge/DRAM Registers (rev 08)
00:02.0 VGA compatible controller: Intel Corporation Device 3ea5 (rev 01)
00:08.0 System peripheral: Intel Corporation Xeon E3-1200 v5/v6 / E3-1500 v5 / 6th/7th Gen Core Processor Gaussian Mixture Model
00:12.0 Signal processing controller: Intel Corporation Device 9df9 (rev 30)
00:14.0 USB controller: Intel Corporation Device 9ded (rev 30)
00:14.2 RAM memory: Intel Corporation Device 9def (rev 30)
00:14.3 Network controller: Intel Corporation Device 9df0 (rev 30)
00:16.0 Communication controller: Intel Corporation Device 9de0 (rev 30)
00:17.0 SATA controller: Intel Corporation Device 9dd3 (rev 30)
00:1c.0 PCI bridge: Intel Corporation Device 9db8 (rev f0)
00:1c.4 PCI bridge: Intel Corporation Device 9dbc (rev f0)
00:1d.0 PCI bridge: Intel Corporation Device 9db0 (rev f0)
00:1d.6 PCI bridge: Intel Corporation Device 9db6 (rev f0)
00:1f.0 ISA bridge: Intel Corporation Device 9d84 (rev 30)
00:1f.3 Audio device: Intel Corporation Device 9dc8 (rev 30)
00:1f.4 SMBus: Intel Corporation Device 9da3 (rev 30)
00:1f.5 Serial bus controller [0c80]: Intel Corporation Device 9da4 (rev 30)
00:1f.6 Ethernet controller: Intel Corporation Ethernet Connection (6) I219-V (rev 30)
02:00.0 PCI bridge: Intel Corporation JHL6340 Thunderbolt 3 Bridge (C step) [Alpine Ridge 2C 2016] (rev 02)
03:00.0 PCI bridge: Intel Corporation JHL6340 Thunderbolt 3 Bridge (C step) [Alpine Ridge 2C 2016] (rev 02)
03:01.0 PCI bridge: Intel Corporation JHL6340 Thunderbolt 3 Bridge (C step) [Alpine Ridge 2C 2016] (rev 02)
03:02.0 PCI bridge: Intel Corporation JHL6340 Thunderbolt 3 Bridge (C step) [Alpine Ridge 2C 2016] (rev 02)
04:00.0 System peripheral: Intel Corporation JHL6340 Thunderbolt 3 NHI (C step) [Alpine Ridge 2C 2016] (rev 02)
05:00.0 PCI bridge: Intel Corporation DSL6540 Thunderbolt 3 Bridge [Alpine Ridge 4C 2015]
06:01.0 PCI bridge: Intel Corporation DSL6540 Thunderbolt 3 Bridge [Alpine Ridge 4C 2015]
06:04.0 PCI bridge: Intel Corporation DSL6540 Thunderbolt 3 Bridge [Alpine Ridge 4C 2015]
07:00.0 VGA compatible controller: NVIDIA Corporation GP107 [GeForce GTX 1050 Ti] (rev a1)
07:00.1 Audio device: NVIDIA Corporation GP107GL High Definition Audio Controller (rev a1)
08:00.0 USB controller: Intel Corporation DSL6540 USB 3.1 Controller [Alpine Ridge]
6c:00.0 USB controller: Intel Corporation Device 15db (rev 02)
6d:00.0 Non-Volatile memory controller: Samsung Electronics Co Ltd NVMe SSD Controller SM981/PM981
6e:00.0 Unassigned class [ff00]: Realtek Semiconductor Co., Ltd. RTS522A PCI Express Card Reader (rev 01)
```

# <a name="intro"/> Intro

When working a couple of years ago at the [University of Leuven](https://www.kuleuven.be/kuleuven/) I have been using Nvidia cards a lot, utilizing their GPGPU capabilities for numerical computations,

Since [Linux kernel](https://www.kernel.org/doc/html/v4.13/admin-guide/thunderbolt.html) has been fully supporting Thunderbolt 3 for some time now and a lot of used eGPUs started surfacing I couldn't help but snatch one up (a [Razer Core X](https://www.razer.com/eu-en/gaming-laptops/razer-core-x)) and arm it with a similarly bargained GTX 1050 Ti.
My goal was to connect it to the Intel NUC via the Thunderbolt port to drive one of the displays, keeping the second display connected with an hdmi and driven by the discrete Intel graphics device.

With this setup I should be able to both enjoy the crisp graphics provided by the GPU or unplug it from the display and use the other monitor if I want to keep the card solely for numbers crunching.

I remember the initial setup of Nvidia drivers to be a hassle, and I expected the same here.
Fortunately as time has passed things had improved quite a bit.

# <a name="drivers"/> Installing the drivers

GNU/Linux distributions like Ubuntu and [Linux Mint](https://www.linuxmint.com/) come with a [`ubuntu-drivers`](https://launchpad.net/ubuntu/+source/ubuntu-drivers-common) package, which makes installing proprietary drivers a lot easier, so that you don't have to deal with clunky ever-changing Nvidia installers and get them straight from the distributions repositories.

You can list the availiable drivers like this:

```shell
filip@filip-Meerkat:~$ sudo ubuntu-drivers devices
== /sys/devices/pci0000:00/0000:00:14.3 ==
modalias : pci:v00008086d00009DF0sv00008086sd00000034bc02sc80i00
vendor   : Intel Corporation
manual_install: True
driver   : backport-iwlwifi-dkms - distro free

== /sys/devices/pci0000:00/0000:00:1c.4/0000:02:00.0/0000:03:01.0/0000:05:00.0/0000:06:01.0/0000:07:00.0 ==
modalias : pci:v000010DEd00001C82sv00003842sd00006253bc03sc00i00
vendor   : NVIDIA Corporation
model    : GP107 [GeForce GTX 1050 Ti]
driver   : nvidia-driver-390 - distro non-free
driver   : nvidia-driver-435 - distro non-free recommended
driver   : nvidia-driver-430 - distro non-free
driver   : xserver-xorg-video-nouveau - distro free builtin
```

And install the recommended versions (here *nvidia-driver-435*) with `sudo ubuntu-drivers install`.
I also installed the *nvidia-settings* program:

```bash
sudo apt install nvidia-settings
```

If you're interested in CUDA development you should be installing the compiler and the toolkit:

```bash
sudo apt-get install nvidia-cuda-dev nvidia-cuda-toolkit
```

# <a name="xorg"/> xorg.conf

Although drivers ship with a `nvidia-xconfig` utility capable of generating the X server config, do not run it.
Instead paste this config to */etc/X11/xorg.conf*, setting the BUS Id to the one reported by the [lspci command](#plugging).

```
Section "Module"
    Load "modesetting"
EndSection

Section "Device"
    Identifier "Device0"
    Driver     "nvidia"
    BusID      "PCI:07:0:0" # set the PCI number from the lspci command
    Option     "AllowEmptyInitialConfiguration"
    Option     "AllowExternalGpus" "True"
EndSection
```

If you're interested in what the *AllowExternalGpu* flag does you can read about it in the [drivers documentation](https://download.nvidia.com/XFree86/Linux-x86_64/435.21/README/xconfigoptions.html#AllowExternalGpus).

# <a name="enjoy"/> Enjoy!

Reboot and your machine should be driving its display with a GPU device:

```
filip@filip-Meerkat:~$ nvidia-xconfig --query-gpu-info
Number of GPUs: 1

GPU #0:
  Name      : GeForce GTX 1050 Ti
  PCI BusID : PCI:7:0:0

  Number of Display Devices: 1

  Display Device 0 (TV-1):
      EDID Name             : LG Electronics 32inch LG FHD
      Minimum HorizSync     : 30.000 kHz
      Maximum HorizSync     : 83.000 kHz
      Minimum VertRefresh   : 56 Hz
      Maximum VertRefresh   : 61 Hz
      Maximum PixelClock    : 150.000 MHz
      Maximum Width         : 1920 pixels
      Maximum Height        : 1080 pixels
      Preferred Width       : 1920 pixels
      Preferred Height      : 1080 pixels
      Preferred VertRefresh : 60 Hz
      Physical Width        : 700 mm
      Physical Height       : 390 mm
```

---
**NOTE**

There is no hot-plug functionality and you will need to remove the created [xorg.conf](#xorg.conf) to be able start xserver after unplugging the device, but I'll take it.
I have not looked into them, but there are projects aiming at bringing the hot-plugging functionality, for example: [https://github.com/karli-sjoberg/gswitch.](https://github.com/karli-sjoberg/gswitch).

---

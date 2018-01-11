---
layout: post
title: Patching your AWS EC2 instance for the Meltdown/Spectre vulnerabilities
---

<!-- TODO: Intro -->

# Updating the instance with the patched kernel

I will describe the steps based on AWS instance running Ubuntu 14.04.5 LTS and GNU/Linux 4.4.0-97-generic kernel prior to applying the patch.

The most up-to-date information on Spectre and Meltdown for Ubuntu can be found here:
<https://wiki.ubuntu.com/SecurityTeam/KnowledgeBase/SpectreAndMeltdown>
It also contains recommended kernel images for various distro versions.

### Step1) SSH into your instance:

`ssh ubuntu@instance.region.compute.amazonaws.com`

Update the repositories:

`sudo apt-get update`

As of writing this post Canonical recommends kernel image 3.13.0-139.188 for Ubuntu 14.04 using 3.13 and 4.4.0-109.132 if you are using the xenial kernel backport (4.4.0), so let's install those:

~~~~
sudo apt-get install linux-headers-4.4.0-109 linux-headers-4.4.0-109-generic linux-image-4.4.0-109-generic linux-image-extra-4.4.0-109-generic --fix-missing
~~~~

### Step2) reboot you instance

You can quickly reboot an instance using the command line if you have ([configured AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)):

`aws ec2 reboot-instances --instance-ids instance-id --region region`

or with the ([EC2 console](https://signin.aws.amazon.com/console).

1. Open the Amazon EC2 console.
2. In the navigation pane, choose Instances.
3. Select the instance and choose Actions, Instance State, Reboot.
4. Choose Yes, Reboot when prompted for confirmation.

### Step2) so did it work?

Check if the instance is back online:

`aws ec2 describe-instance-status --instance-id instance-id --region region`

SSH to it and you can use this ([script](https://github.com/speed47/spectre-meltdown-checker.git)) which does a wonderful job at checking the kernel susceptibility to all known variants of Spectre/Meltdown:

```bash
wget https://raw.githubusercontent.com/speed47/spectre-meltdown-checker/master/spectre-meltdown-checker.sh
chmod a+x spectre-meltdown-checker.sh
sudo ./spectre-meltdown-checker.sh
```
You should see something similar to the screenshot below:

![_config.yml]({{ site.baseurl }}/images/2018-1-11-aws-meltdown/screenshot.jpg)

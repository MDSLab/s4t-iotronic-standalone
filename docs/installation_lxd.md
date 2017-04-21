# Stack4Things installation guide for LXD containers

From a fresh Ubuntu 16.04 installation, first upgrade the system:

```
apt update
apt upgrade
```

Then, install LXD following the instructions you can find [here] (https://www.stgraber.org/2016/03/15/lxd-2-0-installing-and-configuring-lxd-212/).

If you want your containers to get IP addresses from your network's DHCP instead of living on a network of their own create an additional bridge following the guide you can find [here](https://insights.ubuntu.com/2015/11/10/converting-eth0-to-br0-and-getting-all-your-lxc-or-lxd-onto-your-lan/).

I suggest you to create an additional profile that uses that bridge instead of modifying the default profile as suggested in the guide above. This way you can launch containers on the standard bridge if you want. In order to do so follow the following steps: 

```
# lxc profile create mylxdbrprofile
# cat << EOF | lxc profile edit mylxdbrprofile
> name: mylxdbrprofile
> config: {}
> description: A new profile for the new bridge
> devices:
>   eth0:
>     name: eth0
>     nictype: bridged
>     parent: mylxdbr
>     type: nic
> EOF
```

Of course, just change the names of the new profile and of the new bridge as you prefer. 

Now, launch a privileged container with nesting enabled for the IoTronic service:

```
lxc launch ubuntu:16.04 iotronic -p default -p mylxdbrprofile -c security.privileged=true -c security.nesting=true 
```

In order to login you usually need an RSA key: 

```
ssh-keygen -t rsa
lxc exec iotronic - mkdir /root/.ssh
lxc file push ~/.ssh/id_rsa.pub iotronic/root/.ssh/authorized_keys --mode=0600 --uid=0
```

Then, login into the container and follow the IoTronic installation guide you can find [here](https://github.com/MDSLab/s4t-iotronic-standalone/blob/master/docs/installation_ubuntu_16.04.md).

Then you can do the same for the Lightning-rod, instantiating as many containers as you need and following the installation guide you can find [here](https://github.com/MDSLab/s4t-lightning-rod/blob/master/docs/ubuntu1604.md). 

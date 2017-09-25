#!/bin/bash
#set -o verbose

pkill socat

LISTIF=$(ifconfig | grep - | awk '{print $1}')
for i in $LISTIF
do 
echo $i
ip link del $i
done

LISTBR=$(ifconfig -a | grep br | awk '{print $1}')
for i in $LISTBR
do 
echo $i
ip link set $i down
brctl delbr  $i
done

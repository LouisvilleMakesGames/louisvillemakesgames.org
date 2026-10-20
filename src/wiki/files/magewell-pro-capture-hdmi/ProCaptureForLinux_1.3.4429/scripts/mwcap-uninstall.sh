#!/bin/sh

LOGFILE=mwcap_install.log

SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)"
PROCAPTURE_TOP_DIR=$SCRIPT_PATH/..
SRC_DIR=$PROCAPTURE_TOP_DIR/src
MODULE_NAME=ProCapture
MODULE_INSTALL_DIR=/usr/local/share/ProCapture
MODULE_VERSION=1.3.4429
MODULE_SECURE_NAME=MWMOK
MOK_DIR=/usr/local/share/MWMOK/
MOK_DER_FILE=$MOK_DIR/$MODULE_SECURE_NAME.der
MOK_PRIV_FILE=$MOK_DIR/$MODULE_SECURE_NAME.priv
NOT_DEL_MOK=false

parse_arguments() {
    for arg in "$@"; do
        case $arg in
            "not del mok")
                NOT_DEL_MOK=true
                shift
                ;;
            *)
                ;;
        esac
    done
}

echo_string ()
{
    echo "$1" | tee -a $LOGFILE
}

echo_string_nonewline ()
{
    echo -n "$1" | tee -a $LOGFILE
}

NO_REBOOT_PROMPT=""
while getopts "n" flag ; do
   case "$flag" in
      n)NO_REBOOT_PROMPT="YES";;
   esac
done

if [ `id -u` -ne 0 ] ; then
    sudo su -c "$0 $*"
    exit $?
fi

DEPMOD=`which depmod 2>/dev/null`
if [ ! -e "$DEPMOD" ]; then
    echo_string ""
    echo_string "ERROR: Failed to find command: depmod"
    echo_string "   Please install depmod first!"
    echo_string ""
    exit
fi

is_secure_boot_enabled() {
    if [ -d /sys/firmware/efi ]; then
        secure_boot_status=$(mokutil --sb-state 2>/dev/null | grep -i "SecureBoot enabled")
        if [ -n "$secure_boot_status" ]; then
            return 0
        fi
    fi
    return 1
}

remove_module ()
{
    KERNEL_VERSION=`uname -r`
    MODULE_PATH=`find /lib/modules/$KERNEL_VERSION -name ${MODULE_NAME}.ko`
    echo_string_nonewline "Removing $MODULE_PATH ... "
    rm -vf $MODULE_PATH >> $LOGFILE 2>&1
    RET=$?
    if [ $RET -ne 0 ] ; then
        echo_string "Remove $MODULE_PATH failed!"
        exit
    fi
    echo_string "Done."

    if [ -e $DEPMOD ] ; then
        echo_string_nonewline "Re-generating modules.dep and map files ... "
        $DEPMOD -a >> $LOGFILE 2>&1
        echo_string "Done."
    fi

    if [ -d /usr/src/${MODULE_NAME}-${MODULE_VERSION} ] || [ -h /usr/src/${MODULE_NAME}_${MODULE_VERSION} ]; then
        dkms remove -m ${MODULE_NAME} -v ${MODULE_VERSION} --all
        rm -vf /usr/src/${MODULE_NAME}_${MODULE_VERSION} >> $LOGFILE 2>&1
    fi

    for binname in `ls $MODULE_INSTALL_DIR/bin`; do
        if [ -h /usr/bin/$binname ]; then
            rm -vf /usr/bin/$binname >> $LOGFILE 2>&1
        fi
    done

    if is_secure_boot_enabled; then
        echo "NOT_DEL_MOK:$NOT_DEL_MOK"
        if [ -f "$MOK_DER_FILE" ] && [ "$NOT_DEL_MOK" = false ]; then
            echo_string "Secure Boot is enabled. The MOK file $MOK_DER_FILE has been detected."
            echo_string_nonewline "Do you want to keep the MOK directory $MOK_DIR? (Y/N) [Y]: "
            read cont

            if [ "$cont" != "NO" ] && [ "$cont" != "no" ] && \
            [ "$cont" != "N" ] && [ "$cont" != "n" ]; then
                echo_string "MOK directory retained."
            else
                echo_string "MOK directory deleted."
                mokutil --delete "$MOK_DER_FILE"
                rm -vrf "$MOK_DIR"
            fi
        fi
    fi

    if [ -d $MODULE_INSTALL_DIR ]; then
        echo_string_nonewline "Removing installed files ... "
        rm -vrf $MODULE_INSTALL_DIR >> $LOGFILE 2>&1
        echo_string "Done."
    fi

    if [ -e /usr/bin/mwcap-repair.sh ]; then
        rm -vf /usr/bin/mwcap-repair.sh >> $LOGFILE 2>&1
    fi

    if [ -e /usr/bin/mwcap-uninstall.sh ]; then
        rm -vf /usr/bin/mwcap-uninstall.sh >> $LOGFILE 2>&1
    fi

    if [ -e /etc/udev/rules.d/10-procatpure-event-dev.rules ]; then
        rm -vf /etc/udev/rules.d/10-procatpure-event-dev.rules >> $LOGFILE 2>&1
    fi

    if [ -e /etc/modprobe.d/ProCapture.conf ]; then
        rm -vf /etc/modprobe.d/ProCapture.conf >> $LOGFILE 2>&1
    fi
}

parse_arguments "$@"
remove_module

MODULE_LOADED=`lsmod | grep ProCapture`
echo_string ""
if [ -z "$MODULE_LOADED" -o x"$NO_REBOOT_PROMPT" = x"YES" ]; then
echo_string "Uninstall Successfully!"
else
    echo_string "Uninstall Successfully!"
    echo_string "!!!!Reboot is needed to unload module!"
    echo_string_nonewline "Do you wish to reboot now (Y/N) [Y]: "
    read cont

    if [ "$cont" = "NO" -o "$cont" = "no" -o \
         "$cont" = "N" -o "$cont" = "n" ]; then
        echo_string "Reboot canceled! You should reboot your system manually later."
    else
        reboot
    fi
fi
echo_string ""


#!/bin/bash

# This script is used to build the property-booking application.
echo "Followin is a wizard to create the .env file for the property-booking application."

answer_all="n"
answer_db="n"
answer_sess="n"

while [ "$answer_all" != "y" ]; do
    # Setting the Database variables
    while [ "$answer_db" != "y" ]; do
        echo "\n*******************************************"
        echo "************ Database Settings *************"
        echo "*********************************************"
        echo -n "Enter database hostname (127.0.0.1 by default): "
        read db_hostname
        db_hostname="${db_hostname:="127.0.0.1"}"

        echo -n "Enter database port (3306 by default): "
        read db_port
        db_port="${db_port:=3306}"

        echo -n "Enter database username (root by default): "
        read db_user
        db_user="${db_user:=root}"

        echo -n "Enter database password (empty by default): "
        read -s db_password
        db_password="${db_password:=""}"

        echo -en "\nEnter initial manager username (test_admin by default): "
        read init_manager_username
        init_manager_username="${initial_manager_username:=test_admin}"

        echo -n "Enter initial manger password (testtest1 by default): "
        read -s init_manager_pw
        init_manager_pw="${init_manager_pw:=""}"

        echo -n "\n\nThe following are the database variables: "
        echo "Hostname: $db_hostname"
        echo "Port: $db_port"
        echo "Username: $db_user"
        echo "Password: *************"
        echo "Initial manager username: $init_manager_username"
        echo "Initial manager password: *************"

        echo -n "\nProceed with these database settings? (y/n)"
        read answer_db
    done
    # Setting the session variables
    while [ "$answer_sess" != "y" ]; do
        echo "\n*******************************************"
        echo "************* Session Variables *************"
        echo "*********************************************"
        echo -en "Enter the encryption secret (empty by default): "
        read enc_sec
        enc_sec="${enc_sec:=""}"

        echo -en "Enter the session name (kakeru-property-booking by default): "
        read sess_name
        sess_name="${sess_name:="kakeru-property-booking"}"

        echo -en "Enter the session secret (empty by default): "
        read sess_sec
        sess_sec="${sess_sec:=""}"

        echo -n "\n\nThe following are the session variables: \n"
        echo "Encryption secret: $enc_sec"
        echo "Session name: $sess_name"
        echo "Session secret: $sess_sec"

        echo -n "\nProceed with these session settings? (y/n)"
        read answer_sess
    done

    # Setting the LINE credentials
    while [ "$answer_line" != "y" ]; do
        echo "\n*********************************************"
        echo "************* LINE credentials ***************"
        echo "**********************************************"
        echo -en "\nEnter the LINE channel ID (empty by default): "
        read line_login_channel_id
        line_login_channel_id="${line_login_channel_id:=""}"

        echo -en "Enter the LINE channel secret (empty by default): "
        read line_secret
        line_secret="${line_secret:=""}"

        echo -en "Enter the LINE channel liff URI (empty by default): "
        read line_liff_uri
        line_liff_uri="${line_liff_uri:=""}"

        echo -en "Enter the LINE channel access token (empty by default): "
        read line_access_token
        line_access_token="${line_access_token:=""}"

        echo -n "\n\nThe following are the LINE credentials:\n"
        echo "Channel ID: $line_login_channel_id"
        echo "Channel secret: $line_secret"
        echo "Channel access token: $line_access_token"

        echo -n "\nProceed with these LINE credentials? (y/n)"
        read answer_line
    done

    echo "\n*******************************************"
    echo "************ Overall Variables **************"
    echo "*********************************************"
    echo "\nThese are the overall variables: "
    echo "************ Database Settings *************"
    echo "Hostname: $db_hostname"
    echo "Port: $db_port"
    echo "Username: $db_user"
    echo "Password: *************"
    echo "Initial manager username: $init_manager_username"
    echo "Initial manager password: *************"
    echo "************* Session Variables *************"
    echo "Encryption secret: $enc_sec"
    echo "Session name: $sess_name"
    echo "Session secret: $sess_sec"
    echo "************* LINE credentials ***************"
    echo "Channel ID: $line_login_channel_id"
    echo "Channel secret: $line_secret"
    echo "Channel access token: $line_access_token"

    echo -n "\nProceed with these overall settings? (y/n)"
    read answer_all

    echo "Building the property-booking application..."
done

# (1) Backend Setup
# Creating environment variables file
touch .env

echo "DB_HOST=\"$db_hostname\"
DB_PORT=$db_port
DB_DB=\"kakeru_baby_property_booking_db\"
DB_USER=\"$db_user\"
DB_PASSWORD=\"$db_password\"
DB_DIALECT=\"mysql\"
PORT=8080
SITE_URI=\"127.0.0.1:\${PORT}\"
MANAGER_MAIL=\"noreply@x-kakeru.com\"
MANAGER_ID=\"test_admin\"
MANAGER_PW=\"testtest1\"

ENC_SEC=\"$enc_sec\"
SESS_NAME=\"$sess_name\"
SESS_SEC=\"$sess_sec\"

LINE_LOGIN_CHANNEL_ID=\"$line_login_channel_id\"
LINE_CHANNEL_SECRET=\"$line_secret\"
LINE_CHANNEL_ACCESS_TOKEN=\"$line_access_token\"

###DEVELOPMENT
#CONSOLE_ONLY=true
#ENV_TEST=true
#NODE_ENV=development" >.env

# (2) Installing & building required packages
npm i
npm run build

# (3) Database Migration, manager and member initialization
npm run quickSync
npm run initManager

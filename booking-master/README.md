# Property Booking

Base for kakeru baby property booking system

1. [Setup](#setup)
1. [Useful commands](#useful-commands)
1. [DB migration](#db-migration)
1. [Test coverage](#test-coverage)
1. [LIFF App for Local env](#Setting-up-liff-application-for-local-development)

### Setup

1. Create set environment variables with .env file
 <!-- CHECK: 2. Prepare db for testing - lookup backend-src/backend/tests/setEnvVars.ts -->

### Useful commands

```sh
npm i
npm run build
npm run lint
npm run pretty
npm run test

```

##### DB migration

You have 2 options to migrate the database, either directly on your machine or through a container.

###### ① Migrating the database on the machine

DB structure
First, you need to have or create a database (using MySQL commands, MySQL Workbench, etc).
Then you have to run the following command in the root of your project.

```sh
source deploy.sh
```

The previous script will ask you about the database relevant values, please be sure to input the correct values.
After finishing entering the values, the script will:

1. Create '.env' file in the root directory of the project.
1. Build the database accordingly, and initialize it with the necessary values (e.g. Manager info)
 <!-- CHECK: 1. Change the user and password variables in the frontend environment file accordingly. -->

###### ② Migrating an ephemeral database on a container

You can use an ephemeral database on a running container, that will lose its data when the container is stopped.

**Prerequisite**

-   You have to install [Docker](docker.com) and run it on your machine.
-   No special configurations are needed.

To run the container:

1. Open a terminal window, run the following:
    ```sh
    docker compose up
    ```
    This will create a database name: `kakeru_baby_membership_db`
1. In a separate window, you can confirm the creation of the database by accessing the database on the container:
    ```sh
     mysql -P 8083 --protocol=tcp -u root -p
    ```
    The current password of the database is `pwd`. You can change in the `docker-compose.yml` file.
    ⚠️ You have to restart the container again for the new password to take effect.
1. Similar to building the database on the local machine, run the following command

    ```sh
    source deploy.sh
    ```

    In this case, you have to set:
    **hostname**: localhost
    **database port**: 8083

1. If you want to stop the container ⚠️ **Remember: This will remove the database and its data, and that cannot be undone.**
   In a separate terminal, run:
    ```sh
    docker compose down
    ```

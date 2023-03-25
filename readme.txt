sudo apt update
sudo apt install postgresql postgresql-contrib
sudo apt install postgis

sudo su - postgres
psql


CREATE USER rosalia WITH PASSWORD 'uYP*95mrOZrS2asG%ji83s3pp';

CREATE DATABASE rosalia;
GRANT ALL PRIVILEGES ON DATABASE rosalia TO rosalia;

\c rosalia;

CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
SELECT PostGIS_version();

\q
exit

sudo nano /etc/postgresql/14/main/postgresql.conf
listen_addresses = 'localhost,<server_ip_address>'
sudo nano /etc/postgresql/14/main/pg_hba.conf
host all all 192.168.0.100/24 md5
sudo systemctl restart postgresql





sudo apt install nodejs
sudo apt install npm
node -v
npm -v

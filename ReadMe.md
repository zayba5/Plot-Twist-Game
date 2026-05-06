## Plot Twist ReadMe


Plot Twist is a web-based multiplayer storytelling game where players collaboratively build stories over rotating rounds. Each participant adds to a mystery narrative, seeing only the previous segment. After several rounds, full stories are revealed and voted on by category, with points awarded to contributors and a final leaderboard.

**Authors:** Helena Thiessen,  Zayba Syed, Sean Sheng, Alan Xu

**Last modified date:** 5/6/26

**Creation date:** 5/6/26

---  
## Setup Instructions

### To Install Dependencies:
#### The following must be downloaded and installed:
```
nodeJS			: https://nodejs.org/en/download
python 3.11+	: https://www.python.org/downloads/
postgress		: https://www.postgresql.org/download/
sass			: https://sass-lang.com/install/
```

#### Run the following commands:


From root:
```
npm install
```

From frontend:
```
npm install
```

From backend:
```
pip install -r requirements.txt
```
---
### To initialize the database:
#### Run the following from backend:
Before these steps a database environment must be established in the database manager of your choice. 

To create the database tables:
```
python loaddb.py
```

---
### To initialize environment variables:
#### Create a .env in frontend
Set the following environment variables
```
VITE_SITE_TITLE='<title>'
VITE_API='<location>'
```

#### Create a .env in backend
Set the following environment variables

```
user  = <db user>
pass  = <db password>
host  = <host>
port  = <port>
secretKey  = <secret key>
frontHost  = <frontend host>
```
---
## Run Instructions

### To run the application

From the root folder run:
```
npm run dev
```
This concurrently starts the front end and back end to launch the application locally. If it fails to launch, check the console log to ensure that all dependencies were properly installed


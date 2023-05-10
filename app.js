const express = require("express");
const app = express();

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const path = require("path");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

app.use(express.json());

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error :${e.message}`);
  }
};

initializeDBAndServer();

//API 1

app.post("/login/", async (request, response) => {
  let { username, password } = request.body;
  console.log(username, password);

  const selectUserQuery = `
        SELECT * FROM user WHERE username = '${username}';`;

  //const dbUser = await db.get(validUserQuery);
  const dbUser = await db.get(selectUserQuery);

  console.log(dbUser);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const verifyPassword = await bcrypt.compare(password, dbUser.password);
    console.log(verifyPassword);

    if (verifyPassword === true) {
      console.log("Login success");

      const payload = { username: username };

      let jwtToken = await jwt.sign(payload, "ram");
      response.send({ jwtToken });
      //response.send("Login success");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Authentication tokens

const authenticateToken = async (request, response, next) => {
  let jwtToken;

  const authenticate = request.headers["authorization"];

  if (authenticate !== undefined) {
    jwtToken = authenticate.split(" ")[1];
    console.log(jwtToken);
  }
  if (jwtToken !== undefined) {
    const tokenVerify = await jwt.verify(jwtToken, "ram", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
        //response.send(payload);
      }
    });
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

///authenticateToken();

//API 2

app.get("/states/", authenticateToken, async (request, response) => {
  const sqlQuery = `
    SELECT * FROM state;`;

  const allStatesList = await db.all(sqlQuery);

  response.send(
    allStatesList.map((each) => {
      return {
        stateId: each.state_id,
        stateName: each.state_name,
        population: each.population,
      };
    })
  );
});

//API 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const sqlQuery = `
    SELECT * FROM state WHERE state_id = '${stateId}';`;

  const stateList = await db.get(sqlQuery);

  response.send({
    stateId: stateList.state_id,
    stateName: stateList.state_name,
    population: stateList.population,
  });
});

//API 4

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const sqlQuery = `
  INSERT INTO 
        district (district_name,state_id,cases,cured,active,deaths)
    VALUES 
            ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active},${deaths});`;

  const updatingList = await db.run(sqlQuery);
  console.log(updatingList.lastID);

  response.send("District Successfully Added");
});

//API 5

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    console.log(districtId);

    const sqlQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};`;

    const district = await db.get(sqlQuery);

    console.log(district);

    response.send({
      districtId: district.district_id,
      districtName: district.district_name,
      stateId: district.state_id,
      cases: district.cases,
      cured: district.cured,
      active: district.active,
      deaths: district.deaths,
    });
  }
);

//API 6

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;

    console.log(districtId);

    const sqlQuery = `
    DELETE  FROM district WHERE district_id = ${districtId};`;

    const district = await db.run(sqlQuery);

    console.log(district);

    response.send("District Removed");
  }
);

//API 7

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;

    console.log(districtId);
    //('${districtName}', ${stateId}, ${cases}, ${cured}, ${active},${deaths});`;
    const sqlQuery = `
    UPDATE  district
    SET 
        district_name = '${districtName}',
        state_id =   ${stateId},
        cases = ${cases},
        cured =  ${cured},
        active = ${active},
        deaths = ${deaths}

    WHERE district_id = ${districtId};`;

    const district = await db.run(sqlQuery);

    console.log(district);

    response.send("District Details Updated");
  }
);

//API 8

app.get(
  "/states/:stateId/stats",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;

    console.log(stateId);
    const sqlQuery = `
    SELECT SUM(cases),SUM(cured),SUM(active),SUM(deaths) FROM district WHERE state_id = '${stateId}';`;

    const district = await db.get(sqlQuery);

    console.log(district);

    response.send({
      totalCases: district["SUM(cases)"],
      totalCured: district["SUM(cured)"],
      totalActive: district["SUM(active)"],
      totalDeaths: district["SUM(deaths)"],
    });
  }
);

module.exports = app;

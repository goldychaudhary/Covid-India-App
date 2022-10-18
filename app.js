const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};
initializeDBandServer();

//authenticate token middleware function

const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "Secret_key", (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

//APi 1 login

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT * FROM user WHERE username = "${username}"`;
  const dbResponse = await db.get(selectUserQuery);
  if (dbResponse !== undefined) {
    const isPasswordCorrect = await bcrypt.compare(
      password,
      dbResponse.password
    );
    if (isPasswordCorrect === true) {
      const payload = { username: username };
      jwtToken = jwt.sign(payload, "Secret_key");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//API 2
app.get("/states/", authenticateToken, async (request, response) => {
  const getStateQuery = `
    SELECT * FROM state;`;
  const allStates = await db.all(getStateQuery);
  response.send(allStates);
});

//API 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQ = `
    SELECT * FROM state
    WHERE state_id = ${stateId}`;
  const state = await db.get(getStateQ);
  response.send(state);
});

//API 4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createNewDistrict = `
INSERT INTO district (
district_name,
state_id,
cases,
cured,
active,
deaths)
VALUES ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');`;
  const dbResponse = await db.run(createNewDistrict);
  district_id = dbResponse.lastId;
  response.send("District Successfully Added");
});

//API 5

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    console.log(districtId);
    const getDistrictQ = `
    SELECT * FROM district 
    WHERE district_id = "${districtId}";`;
    const dist = await db.get(getDistrictQ);
    response.send(dist);
  }
);

//API 6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const dltQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId}`;
    await db.run(dltQuery);
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
    const updateQuery = `
    UPDATE district
    SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths};
    `;
    await db.run(updateQuery);
    response.send("District Details Updated");
  }
);

//API 8

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const totalStatsQ = `
    SELECT 
    sum(district.cases) as totalCases,
    sum(district.cured) as totalCured,
    sum(district.active) as totalActive,
    sum(district.deaths) as totalDeaths
    FROM state INNER JOIN district on state.state_id = district.state_id
    `;
    const dbObject = await db.all(totalStatsQ);

    response.send(dbObject[0]);
  }
);
module.exports = app;

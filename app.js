const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();
const convertStateObjectToResponseObject=(dbObject)=>{
    return{
        stateId:dbObject.state_id,
        stateName:dbObject.state_name,
        population:dbObject.population,
    };
};
const convertDistrictObjectToResponseObject=(dbObject)=>{
    return{
        districtId:dbObject.district_id,
        districtName:dbObject.district_name,
        stateId:dbObject.state_id,
        cases:dbObject.cases,
        cured:dbObject.cured,
        active:dbObject.active,
        deaths:dbObject.deaths,
    };
};
function authenticateToken(request,response,next) {
    let jwtToken;
    const authHeader=request.headers["authorization"];
    if(authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1];
    }
    if(jwtToken===undefined){
        response.status(401);
        response.send("Invalid JWT Token");
    }else{
        jwt.verify(jwtToken,"MY_SECRET_TOKEN",async(error,payload)=>{
            if(error){
                response.status(401);
                response.send("Invalid JWT Token")
            }else{
                next();
            }
        });
    }
}
app.post("/login/",async(request,response)=>{
    const {username,password}=request.body;
    const selectUserQuery=`select * from user where username='${username}';`;
    const dbUser=await db.get(selectUserQuery);
    if(dbUser===undefined){
        response.status(400);
        response.send("Invalid user");
    }else{
        const isPasswordMatched=await bcrypt.compare(password,dbUser.password);
        if(isPasswordMatched===true){
            const payload={username:username};
            const jwtToken=jwt.sign(payload,"THE_SECRET_KEY");

            response.send({jwtToken});
        }else{
            response.status(400);
            response.send("Invalid password");
        }
    }
});
//api 

app.get("/states/",authenticateToken,async(request,response)=>{
    const getStatesQuery=`select * from state;`;
    const statesArray=await db.all(getStatesQuery);
    request.send(
        statesArray.map((eachStates)=>
        convertStateObjectToResponseObject(eachStates)
        )
    );
});

//api 3 

app.get("/states/:stateId/",authenticateToken,async(request,response)=>{
    const {stateId}=request.params;
    const getStatusQuery=`select * from state where stateId='${stateId}';`;
   const statesArray= await db.get(getStatusQuery);
   request.send(convertStateObjectToResponseObject(statesArray));
});

//api 4 

app.post("/districts/",authenticateToken,async(request,response)=>{
    const{state_id,district_name,cases,cured,active,deaths}=request.body;
    const postDistrictQuery=`insert into district(state_id,district_name,cases,cured,active,deaths)
    values ( '${stateId}','${districtName}','${cases}','${cured}','${active}','${deaths}');`;
    await db.run(postDistrictQuery);
    response.send("District Successfully Added");
});

//api 5

app.get("/districts/:districtId/",authenticateToken,async(request,response)=>{
    const{districtId}=request.params;
    const getDistrictQuery=`select * from district where district_id=${districtId};`;
    districtArray=await db.get(getDistrictQuery);
    response.send(convertDistrictObjectToResponseObject(districtArray));
});

//api 6 
app.delete("/districts/:districtId/",authenticateToken,async(request,response)=>{
    const{districtId}=request.params;
    const getDistrictQuery=`delete from district where district_id=${districtId};`;
    districtArray=await db.get(getDistrictQuery);
    response.send("District Removed");
});
//api 7

app.put("/districts/:districtId/",authenticateToken,async(request,response)=>{
    const{state_id,district_name,cases,cured,active,deaths}=request.body;
    const{districtId}=request.params;
    const updateQuery=`update district 
    set  state_id='${stateId}',district_name= '${districtName}',
    cases='${cases}',
    cured='${cured}',
    active='${active}',
    deaths='${deaths}' where district_id=${districtId};`;
    await db.run(updateQuery);
    response.send("District Details updated");

})
//api 8
app.get("/states/:stateId/stats/",authenticateToken,async(request,response)=>{
    const {stateId}=request.params;
    const getStatesQuery=`select SUM(cases),SUM(cured),SUM(active),SUM(deaths) from district where state_id=${stateId};`;
    const stats=await db.get(getStatesQuery);
    response.send({
        totalCases:stats["SUM(cases)"],
        totalCured:stats["SUM(cured)"],
        totalActive:stats["SUM(active)"],
        totalDeaths:stats["SUM(deaths)"],
    });
  
});
module.exports=app;
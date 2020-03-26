"use strict";
// const AWS = require('aws-sdk');
// const db = new AWS.DynamoDB.DocumentClient();
// const TABLE_NAME = process.env.TABLE_NAME || '';
// const USER_KEY = process.env.USER_KEY || '';
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = async (event = {}) => {
    console.debug("get-all event: " + JSON.stringify(event));
    // const params = {
    //   TableName: TABLE_NAME,
    // };
    // const queryStringParameters = event.queryStringParameters;
    // try {
    //   var response;
    //   if(event && queryStringParameters){
    //     // const params = {
    //     //   TableName: TABLE_NAME,
    //     //   Key: {
    //     //     [USER_KEY]: queryStringParameters[USER_KEY]
    //     //   }
    //     // };
    //     console.debug("params: " + JSON.stringify(params));
    //     // response = await db.get(params).promise();
    //     response = await db.scan(params).promise();
    //   } else {
    //     response = await db.scan(params).promise();
    //   }
    return { statusCode: 200 };
    // } catch (dbError) {
    //   return { statusCode: 500, body: JSON.stringify(dbError) };
    // }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWFsbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1hbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyxnREFBZ0Q7QUFDaEQsbURBQW1EO0FBQ25ELCtDQUErQzs7QUFFbEMsUUFBQSxPQUFPLEdBQUcsS0FBSyxFQUFFLFFBQWEsRUFBRSxFQUFnQixFQUFFO0lBQzdELE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3pELG1CQUFtQjtJQUNuQiwyQkFBMkI7SUFDM0IsS0FBSztJQUVMLDZEQUE2RDtJQUU3RCxRQUFRO0lBQ1Isa0JBQWtCO0lBQ2xCLHdDQUF3QztJQUN4QywwQkFBMEI7SUFDMUIsa0NBQWtDO0lBQ2xDLGtCQUFrQjtJQUNsQix5REFBeUQ7SUFDekQsYUFBYTtJQUNiLFlBQVk7SUFDWiwwREFBMEQ7SUFDMUQsb0RBQW9EO0lBQ3BELGtEQUFrRDtJQUNsRCxhQUFhO0lBQ2Isa0RBQWtEO0lBQ2xELE1BQU07SUFDSixPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQzdCLHNCQUFzQjtJQUN0QiwrREFBK0Q7SUFDL0QsSUFBSTtBQUNOLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGNvbnN0IEFXUyA9IHJlcXVpcmUoJ2F3cy1zZGsnKTtcbi8vIGNvbnN0IGRiID0gbmV3IEFXUy5EeW5hbW9EQi5Eb2N1bWVudENsaWVudCgpO1xuLy8gY29uc3QgVEFCTEVfTkFNRSA9IHByb2Nlc3MuZW52LlRBQkxFX05BTUUgfHwgJyc7XG4vLyBjb25zdCBVU0VSX0tFWSA9IHByb2Nlc3MuZW52LlVTRVJfS0VZIHx8ICcnO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogYW55ID0ge30pOiBQcm9taXNlPGFueT4gPT4ge1xuICBjb25zb2xlLmRlYnVnKFwiZ2V0LWFsbCBldmVudDogXCIgKyBKU09OLnN0cmluZ2lmeShldmVudCkpO1xuICAvLyBjb25zdCBwYXJhbXMgPSB7XG4gIC8vICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxuICAvLyB9O1xuXG4gIC8vIGNvbnN0IHF1ZXJ5U3RyaW5nUGFyYW1ldGVycyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycztcblxuICAvLyB0cnkge1xuICAvLyAgIHZhciByZXNwb25zZTtcbiAgLy8gICBpZihldmVudCAmJiBxdWVyeVN0cmluZ1BhcmFtZXRlcnMpe1xuICAvLyAgICAgLy8gY29uc3QgcGFyYW1zID0ge1xuICAvLyAgICAgLy8gICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXG4gIC8vICAgICAvLyAgIEtleToge1xuICAvLyAgICAgLy8gICAgIFtVU0VSX0tFWV06IHF1ZXJ5U3RyaW5nUGFyYW1ldGVyc1tVU0VSX0tFWV1cbiAgLy8gICAgIC8vICAgfVxuICAvLyAgICAgLy8gfTtcbiAgLy8gICAgIGNvbnNvbGUuZGVidWcoXCJwYXJhbXM6IFwiICsgSlNPTi5zdHJpbmdpZnkocGFyYW1zKSk7XG4gIC8vICAgICAvLyByZXNwb25zZSA9IGF3YWl0IGRiLmdldChwYXJhbXMpLnByb21pc2UoKTtcbiAgLy8gICAgIHJlc3BvbnNlID0gYXdhaXQgZGIuc2NhbihwYXJhbXMpLnByb21pc2UoKTtcbiAgLy8gICB9IGVsc2Uge1xuICAvLyAgICAgcmVzcG9uc2UgPSBhd2FpdCBkYi5zY2FuKHBhcmFtcykucHJvbWlzZSgpO1xuICAvLyAgIH1cbiAgICByZXR1cm4geyBzdGF0dXNDb2RlOiAyMDAgfTtcbiAgLy8gfSBjYXRjaCAoZGJFcnJvcikge1xuICAvLyAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDUwMCwgYm9keTogSlNPTi5zdHJpbmdpZnkoZGJFcnJvcikgfTtcbiAgLy8gfVxufTtcbiJdfQ==
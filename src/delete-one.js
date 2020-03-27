"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';
const SORT_KEY = process.env.SORT_KEY || '';
exports.handler = async (event = {}) => {
    const requestedItemId = event.pathParameters[SORT_KEY];
    if (!requestedItemId) {
        return { statusCode: 400, body: `Error: You are missing the path parameter ${SORT_KEY}` };
    }
    const params = {
        TableName: TABLE_NAME,
        Key: {
            [SORT_KEY]: requestedItemId,
        },
    };
    try {
        await db.delete(params).promise();
        return { statusCode: 200, body: '' };
    }
    catch (dbError) {
        return { statusCode: 500, body: JSON.stringify(dbError) };
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlLW9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlbGV0ZS1vbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQzdDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQztBQUNoRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7QUFFL0IsUUFBQSxPQUFPLEdBQUcsS0FBSyxFQUFFLFFBQWEsRUFBRSxFQUFnQixFQUFFO0lBQzdELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkQsSUFBSSxDQUFDLGVBQWUsRUFBRTtRQUNwQixPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsNkNBQTZDLFFBQVEsRUFBRSxFQUFFLENBQUM7S0FDM0Y7SUFFRCxNQUFNLE1BQU0sR0FBRztRQUNiLFNBQVMsRUFBRSxVQUFVO1FBQ3JCLEdBQUcsRUFBRTtZQUNILENBQUMsUUFBUSxDQUFDLEVBQUUsZUFBZTtTQUM1QjtLQUNGLENBQUM7SUFFRixJQUFJO1FBQ0YsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztLQUN0QztJQUFDLE9BQU8sT0FBTyxFQUFFO1FBQ2hCLE9BQU8sRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7S0FDM0Q7QUFDSCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBBV1MgPSByZXF1aXJlKCdhd3Mtc2RrJyk7XG5jb25zdCBkYiA9IG5ldyBBV1MuRHluYW1vREIuRG9jdW1lbnRDbGllbnQoKTtcbmNvbnN0IFRBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5UQUJMRV9OQU1FIHx8ICcnO1xuY29uc3QgU09SVF9LRVkgPSBwcm9jZXNzLmVudi5TT1JUX0tFWSB8fCAnJztcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IGFueSA9IHt9KTogUHJvbWlzZTxhbnk+ID0+IHtcbiAgY29uc3QgcmVxdWVzdGVkSXRlbUlkID0gZXZlbnQucGF0aFBhcmFtZXRlcnNbU09SVF9LRVldO1xuICBpZiAoIXJlcXVlc3RlZEl0ZW1JZCkge1xuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDQwMCwgYm9keTogYEVycm9yOiBZb3UgYXJlIG1pc3NpbmcgdGhlIHBhdGggcGFyYW1ldGVyICR7U09SVF9LRVl9YCB9O1xuICB9XG5cbiAgY29uc3QgcGFyYW1zID0ge1xuICAgIFRhYmxlTmFtZTogVEFCTEVfTkFNRSxcbiAgICBLZXk6IHtcbiAgICAgIFtTT1JUX0tFWV06IHJlcXVlc3RlZEl0ZW1JZCxcbiAgICB9LFxuICB9O1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZGIuZGVsZXRlKHBhcmFtcykucHJvbWlzZSgpO1xuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDIwMCwgYm9keTogJycgfTtcbiAgfSBjYXRjaCAoZGJFcnJvcikge1xuICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDUwMCwgYm9keTogSlNPTi5zdHJpbmdpZnkoZGJFcnJvcikgfTtcbiAgfVxufTtcbiJdfQ==
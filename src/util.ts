import { DynamoDB } from 'aws-sdk';
import { adminTable } from "./statics";

const db = new DynamoDB.DocumentClient();


export async function isAdmin(userName: string) {
  const adminTableParams = {
    TableName: adminTable.name,
    Key: {
      [adminTable.primaryKey]: userName,
    },
  };

  console.debug("adminTableParams: " + JSON.stringify(adminTableParams));
  const resp = await db.get(adminTableParams).promise();
  const isAdmin = resp.Item? true: false;
  console.debug(`User: ${userName} Admin: ${isAdmin}`);
  return isAdmin;
}



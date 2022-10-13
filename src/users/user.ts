import { Privileges } from "./privileges";

/**
 * Represents a user (player or administrator) for remembering
 * clients accross http requests / websocket messages.
 */
class User<Connection> {

  readonly connection: Connection;
  readonly privileges: Privileges;

  constructor(connection: Connection, privileges: Privileges) {
    this.connection = connection;
    this.privileges = privileges;
  }

}

export default User;
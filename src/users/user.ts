import { Privileges } from "./privileges";

/**
 * Represents a user (player or administrator) for remembering
 * clients accross http requests / websocket messages.
 */
class User<Connection> {

  private readonly connection: Connection;
  private readonly privileges: Privileges;

  constructor(connection: Connection, privileges: Privileges) {
    this.connection = connection;
    this.privileges = privileges;
  }

}

export default User;
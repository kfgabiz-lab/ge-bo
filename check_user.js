const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'bo',
    password: '1234',
    port: 5432,
});

async function checkUser() {
    await client.connect();
    try {
        const res = await client.query("SELECT id, email, name, employee_id, is_active, password_hash FROM admin_user WHERE email = 'admin2@bo.com'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkUser();

const { pool } = require('./db')

const getGyakorlatok = async () => {
//     try {
//       return await new Promise(function (resolve, reject) {
//         pool.query("SELECT * FROM gyakorlat", (error, results) => {
//           if (error) {
//             reject(error);
//           }
//           if (results && results.rows) {
//             resolve(results.rows);
//           } else {
//             reject(new Error("No results found"));
//           }
//         });
//       });
//     } catch (error_1) {
//       console.error(error_1);
//       throw new Error("Internal server error");
//     }
// };
  const r = await pool.query('SELECT * FROM gyakorlat')
  return r.rows
}

const getGyakorlatokFiltered = async (testreszek, tipus) => {
  let tipusok = []
  if (tipus === 'komplex') tipusok = ['nyujtas', 'erosites']
  else tipusok = [tipus]

//   const text = "SELECT * FROM gyakorlat WHERE testresz_id = ANY($1) AND tipus = ANY($2)";
//   const values = [testreszek, tipusok];

//   try {
//     const res = await pool.query(text, values);
//     return res.rows;
//   } catch (error) {
//     console.error(error);
//     throw new Error("Internal server error");
//   }
// };
  const r = await pool.query(
    'SELECT * FROM gyakorlat WHERE testresz_id = ANY($1) AND tipus = ANY($2)',
    [testreszek, tipusok],
  )
  return r.rows
}

module.exports = {
  getGyakorlatok,
  getGyakorlatokFiltered,
}

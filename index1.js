// /////////////////////////++THIẾT LẬP KẾT NỐI WEB++/////////////////////////
var express = require("express");
var app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(3000);
// Home calling
app.get("/", function (req, res) {
    res.render("home")
});
//
var nodes7 = require('nodes7');
var conn_plc = new nodes7;
conn_plc.initiateConnection({ port: 102, host: '192.168.0.1', rack: 0, slot: 1 }, PLC_connected);
var tags_list = {
    tag_Bool: 'DB1,X0.0',
    tag_Byte: 'DB1,BYTE1',
    tag_Integer: 'DB1.INT2',
    tag_Real: 'DB1,REAL4',
    tag_String: 'DB1,S8.256'
};
//Gửi dữ liệu Tag cho PLC
function PLC_connected(err) {
    if (typeof (err) !== "undefined") {
        console.log(err);// Hiển thị lỗi kết nối nếu ko kết nối dc plc
    }
    conn_plc.setTranslationCB(function (tag) { return tags_list[tag]; }); //Đưa giá trị đọc lên từ PLC 
    conn_plc.addItems([
        'tag_Bool',
        'tag_Byte',
        'tag_Integer',
        'tag_String'
    ]
    )
}
// Đọc dữ liệu từ PLC đưa vào mảng Tags
var arr_tag_value = []; //Tạo mảng
function valuesReady(anythingBad, values) {
    if (anythingBad) { console.log("lỗi khi đọc dữ liệu tag"); } //Cảnh báo lỗi
    var lodash = require('lodash'); // Chuyển var sang array
    arr_tag_value = lodash.map(values, (item) => item);
    console.log(values); //Hiển thị giá trị để kiểm tra

}
//Hàm scan giá trị
function fn_read_data_scan() {
    conn_plc.readAllItems(valuesReady);
}
setInterval(
    () => fn_read_data_scan(),
    1000
);
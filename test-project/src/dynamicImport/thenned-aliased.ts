import("./internal/privateModule").then((x) => {
  const alias = x;
  void x.PRIVATE;
  void alias.PRIVATE;
  const alias2 = alias;
  void alias2.PRIVATE;
  void alias2.PUBLIC;
  const obj = { prop: "" };
  void obj.prop;
});

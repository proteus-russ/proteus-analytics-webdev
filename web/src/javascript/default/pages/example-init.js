pa("create", "mytracker", "/ws/pa");
pa("provide", "eventTracker", EventTracker);
pa("provide", "outboundLinkTracker", OutboundLinkTracker);
pa("provide", "impressionTracker", ImpressionTracker);
pa("provide", "cleanUrlTracker", CleanUrlTracker);
pa("require", "eventTracker", {
	"attributePrefix": "data-pa-"
});
const dims = {'engage_account_id': '$accountid', 'temporality': '$temporality', 'member_type': '$memberType'};
pa("set", dims);
pa("require", "outboundLinkTracker");
pa("require", "cleanUrlTracker", {stripQuery: true, trailingSlash: "remove"});
pa("require", "impressionTracker", {attributePrefix: "data-pa-", "elements": ["questions-greeting"]});

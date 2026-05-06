const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/admin/AdminAppointments.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Convert CRLF to LF for easier replacing
content = content.replace(/\r\n/g, '\n');

// 1. Desktop view
const desktopTarget = `                          {isRescheduled && (
                            <span className="w-fit rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-medium text-[#6d28d9]">
                              Rescheduled
                            </span>
                          )}
                        </div>
                      </td>`;
                      
const desktopReplacement = `                          {isRescheduled && (
                            <span className="w-fit rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-medium text-[#6d28d9]">
                              Rescheduled
                            </span>
                          )}
                          {normalizedStatus === 'cancelled' && apt.rejection_reason && (
                            <span className="text-xs text-[#DC2626] max-w-[150px] truncate" title={apt.rejection_reason}>
                              Reason: {apt.rejection_reason}
                            </span>
                          )}
                        </div>
                      </td>`;

// 2. Mobile view
const mobileTarget = `                        <span 
                          className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-sm"
                          style={statusBadgeStyle}
                        >
                          {normalizedStatus === 'booked' ? 'PENDING' : normalizedStatus.toUpperCase()}
                        </span>
                        
                        <div className="mt-auto flex flex-col gap-1.5">`;

const mobileReplacement = `                        <span 
                          className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-sm"
                          style={statusBadgeStyle}
                        >
                          {normalizedStatus === 'booked' ? 'PENDING' : normalizedStatus.toUpperCase()}
                        </span>
                        {normalizedStatus === 'cancelled' && apt.rejection_reason && (
                          <div className="text-[9px] text-[#DC2626] text-right max-w-[80px] truncate" title={apt.rejection_reason}>
                            {apt.rejection_reason}
                          </div>
                        )}
                        
                        <div className="mt-auto flex flex-col gap-1.5">`;

// 3. Modal details
const modalTarget = `              <div className="mt-4 rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Payment Details</p>`;

const modalReplacement = `              {selectedAppointment.status === 'cancelled' && selectedAppointment.rejection_reason && (
                <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#DC2626]">Cancellation Reason</p>
                  <div className="mt-2 text-sm text-[#991B1B]">
                    {selectedAppointment.rejection_reason}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Payment Details</p>`;

let count = 0;
if (content.includes(desktopTarget)) { content = content.replace(desktopTarget, desktopReplacement); count++; }
else console.log("Failed to match desktop target");

if (content.includes(mobileTarget)) { content = content.replace(mobileTarget, mobileReplacement); count++; }
else console.log("Failed to match mobile target");

if (content.includes(modalTarget)) { content = content.replace(modalTarget, modalReplacement); count++; }
else console.log("Failed to match modal target");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced ' + count + ' targets.');

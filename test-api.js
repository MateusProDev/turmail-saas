import fetch from 'node-fetch';

const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk1MTg5MTkxMTA3NjA1NDM0NGUxNWUyNTY0MjViYjQyNWVlYjNhNWMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiRsOpIGUgUmF6w6NvIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0tPLWJPaUJvY2EwMU5zNC1QZkpUb040RGRjWnFtUmxvV0h6U1puc1RpekVPZHRWSGRVPXM5Ni1jIiwiYWRtaW4iOnRydWUsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS90dXJtYWlsLXNhYXMiLCJhdWQiOiJ0dXJtYWlsLXNhYXMiLCJhdXRoX3RpbWUiOjE3NjU1NDk4MTYsInVzZXJfaWQiOiIzY0k5V3FiVmV6YjRMRVZWaDU3bmJuWWV6TlYyIiwic3ViIjoiM2NJOVdxYlZlemI0TEVWVmg1N25iblllek5WMiIsImlhdCI6MTc2NTU0OTgxNiwiZXhwIjoxNzY1NTUzNDE2LCJlbWFpbCI6Im1hdGVvZmVycmVpcmEwMDBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMTI4MTI0OTI3NTA5MDg3MDk4NTIiXSwiZW1haWwiOlsibWF0ZW9mZXJyZWlyYTAwMEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.gU-YAhKhcpoBpdf5sTUdix0yeof9nrExjWOmSqnPjYTLrDf46jMwUXf29FJFm9t4G3hu-qaGqw-Ro_oKQCqIBw38s138jSDsi2dt2NJqFTiU4DpqnirSX5yQyzQNM2MkSWgDiSCkmVToAsaDSG_dFCMy1xoHZUAQEHgWJmyqIxNNIvaoA_eobEXOlIHrtZUVyxjuy24Gum29eFO2-25DNV1jyilmnnMce9LwAcBsX_CmAn642klTEyHiAL1SoJTFF4JUKc9jr7p5JcrCB0-fOOFvQHCx_PYZURuiZlWxFQrjdQmMdbrNKIkXni3VdkOLE0abWw_qXR4n0S9nbit1KA';

try {
  const response = await fetch('http://localhost:3001/api/brevo/create-sender', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      email: 'test@example.com',
      name: 'Test Sender',
      tenantId: 'tenant_noa'
    })
  });

  const data = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', data);
} catch (error) {
  console.error('Error:', error);
}
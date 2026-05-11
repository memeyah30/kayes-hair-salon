<?php
echo "OpenSSL Enabled: " . (extension_loaded('openssl') ? 'YES' : 'NO') . "\n";
echo "OpenSSL version: " . OPENSSL_VERSION_TEXT . "\n";
echo "allow_url_fopen: " . ini_get('allow_url_fopen') . "\n";
echo "openssl.cafile: " . ini_get('openssl.cafile') . "\n";
echo "openssl.capath: " . ini_get('openssl.capath') . "\n";
echo "curl.cainfo: " . ini_get('curl.cainfo') . "\n";

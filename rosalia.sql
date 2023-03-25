PGDMP         (                {           insects    14.5    14.4     �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    43841    insects    DATABASE     d   CREATE DATABASE insects WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'English_Canada.1252';
    DROP DATABASE insects;
                postgres    false                        3079    43867    postgis 	   EXTENSION     ;   CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
    DROP EXTENSION postgis;
                   false            �           0    0    EXTENSION postgis    COMMENT     ^   COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';
                        false    2            �            1259    61337 	   sightings    TABLE     �  CREATE TABLE public.sightings (
    id integer NOT NULL,
    sighting_code integer NOT NULL,
    species character varying(50) NOT NULL,
    sighting_date timestamp without time zone NOT NULL,
    notes text,
    created_date timestamp without time zone DEFAULT now(),
    picture1 character varying(100),
    picture2 character varying(100),
    picture3 character varying(100),
    longitude numeric(9,6) NOT NULL,
    latitude numeric(8,6) NOT NULL,
    geom public.geometry(Point,4326) NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_by character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);
    DROP TABLE public.sightings;
       public         heap    postgres    false    2    2    2    2    2    2    2    2            �            1259    61335    sightings_id_seq    SEQUENCE     �   CREATE SEQUENCE public.sightings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.sightings_id_seq;
       public          postgres    false    219            �           0    0    sightings_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.sightings_id_seq OWNED BY public.sightings.id;
          public          postgres    false    217            �            1259    61336    sightings_sighting_code_seq    SEQUENCE     �   CREATE SEQUENCE public.sightings_sighting_code_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 2   DROP SEQUENCE public.sightings_sighting_code_seq;
       public          postgres    false    219            �           0    0    sightings_sighting_code_seq    SEQUENCE OWNED BY     [   ALTER SEQUENCE public.sightings_sighting_code_seq OWNED BY public.sightings.sighting_code;
          public          postgres    false    218            �            1259    61322    users    TABLE     �  CREATE TABLE public.users (
    id integer NOT NULL,
    user_code character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.users;
       public         heap    postgres    false            �            1259    61321    users_id_seq    SEQUENCE     �   CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.users_id_seq;
       public          postgres    false    216            �           0    0    users_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
          public          postgres    false    215            �           2604    61340    sightings id    DEFAULT     l   ALTER TABLE ONLY public.sightings ALTER COLUMN id SET DEFAULT nextval('public.sightings_id_seq'::regclass);
 ;   ALTER TABLE public.sightings ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    219    217    219            �           2604    61341    sightings sighting_code    DEFAULT     �   ALTER TABLE ONLY public.sightings ALTER COLUMN sighting_code SET DEFAULT nextval('public.sightings_sighting_code_seq'::regclass);
 F   ALTER TABLE public.sightings ALTER COLUMN sighting_code DROP DEFAULT;
       public          postgres    false    219    218    219            �           2604    61325    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    216    215    216            }          0    61337 	   sightings 
   TABLE DATA           �   COPY public.sightings (id, sighting_code, species, sighting_date, notes, created_date, picture1, picture2, picture3, longitude, latitude, geom, verified, created_by, created_at, updated_at) FROM stdin;
    public          postgres    false    219   ;"       �          0    44177    spatial_ref_sys 
   TABLE DATA           X   COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
    public          postgres    false    211   X"       z          0    61322    users 
   TABLE DATA           _   COPY public.users (id, user_code, email, name, password, role, active, created_at) FROM stdin;
    public          postgres    false    216   u"       �           0    0    sightings_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.sightings_id_seq', 1, false);
          public          postgres    false    217            �           0    0    sightings_sighting_code_seq    SEQUENCE SET     J   SELECT pg_catalog.setval('public.sightings_sighting_code_seq', 1, false);
          public          postgres    false    218            �           0    0    users_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.users_id_seq', 1, false);
          public          postgres    false    215            �           2606    61350    sightings sighting_code_key 
   CONSTRAINT     _   ALTER TABLE ONLY public.sightings
    ADD CONSTRAINT sighting_code_key UNIQUE (sighting_code);
 E   ALTER TABLE ONLY public.sightings DROP CONSTRAINT sighting_code_key;
       public            postgres    false    219            �           2606    61348    sightings sightings_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.sightings
    ADD CONSTRAINT sightings_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.sightings DROP CONSTRAINT sightings_pkey;
       public            postgres    false    219            �           2606    61332    users user_code_key 
   CONSTRAINT     S   ALTER TABLE ONLY public.users
    ADD CONSTRAINT user_code_key UNIQUE (user_code);
 =   ALTER TABLE ONLY public.users DROP CONSTRAINT user_code_key;
       public            postgres    false    216            �           2606    61334    users users_email_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
 ?   ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
       public            postgres    false    216            �           2606    61330    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public            postgres    false    216            �           2606    61351 #   sightings sightings_created_by_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.sightings
    ADD CONSTRAINT sightings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_code);
 M   ALTER TABLE ONLY public.sightings DROP CONSTRAINT sightings_created_by_fkey;
       public          postgres    false    4063    219    216            }      x������ � �      �      x������ � �      z      x������ � �     